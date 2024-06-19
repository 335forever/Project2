document.addEventListener('DOMContentLoaded', async () => {
    try {
        const ctx = document.getElementById('dhtChart').getContext('2d');

        // Gọi API để lấy dữ liệu ban đầu
        const initialData = await fetch('/api/data/getdhtdata?nums=20');
        const initialDataJson = await initialData.json();

        // Mảng dữ liệu ban đầu
        let chartData = initialDataJson.map(dataPoint => ({
            temperature: dataPoint.temperature,
            humidity: dataPoint.humidity,
            time: new Date(dataPoint.created_at) // Thêm giá trị thời gian
        }));


        // Khởi tạo dữ liệu biểu đồ ban đầu
        const data = {
            labels: [],
            datasets: [
                {
                    label: 'Nhiệt độ (°C)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    data: [],
                    fill: false,
                    yAxisID: 'y-axis-1',
                },
                {
                    label: 'Độ ẩm (%)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    data: [],
                    fill: false,
                    yAxisID: 'y-axis-2',
                },
            ],
        };

        // Cấu hình biểu đồ
        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Thời gian',
                        },
                    },
                    'y-axis-1': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Nhiệt độ (°C)',
                        },
                        // min: 20, // Giá trị tối thiểu
                        // max: 50, // Giá trị tối đa
                    },
                    'y-axis-2': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Độ ẩm (%)',
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                },
            },
        };

        // Khởi tạo biểu đồ
        const dhtChart = new Chart(ctx, config);

        // Hàm cập nhật dữ liệu cho biểu đồ
        function updateChartData(temperature, humidity, time) {
            // Thêm dữ liệu mới vào mảng
            chartData.push({ temperature, humidity, time });

            // Nếu mảng vượt quá 20 phần tử, xóa phần tử đầu tiên
            if (chartData.length > 20) {
                chartData.shift();
            }

            // Cập nhật biểu đồ
            updateChart();
        }
        
        // Cập nhật biểu đồ với dữ liệu mới
        function updateChart() {
            // Lấy mảng giá trị nhiệt độ và độ ẩm từ mảng chartData
            const temperatures = chartData.map(dataPoint => dataPoint.temperature);
            const humidities = chartData.map(dataPoint => dataPoint.humidity);
            const times = chartData.map(dataPoint => dataPoint.time);

            // Chỉ lấy giờ, phút và giây từ mảng thời gian
            const formattedTimes = times.map(time => {
                const date = new Date(time);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            });

            // Cập nhật dữ liệu cho biểu đồ
            dhtChart.data.labels = formattedTimes;
            dhtChart.data.datasets[0].data = temperatures;
            dhtChart.data.datasets[1].data = humidities;
            dhtChart.update();
        }

        // Xác định URL cho WebSocket dựa vào môi trường
        let wsUrl;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Môi trường local
            wsUrl = 'ws://localhost:8080';
        } else {
            // Môi trường triển khai (ví dụ: EC2 instance)
            wsUrl = `ws://${window.location.hostname}:8080`;
        }

        // WebSocket
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = (event) => {
            const newData = JSON.parse(event.data);
            updateChartData(newData.temperature, newData.humidity, newData.current_time);
        };

        // Lấy dữ liệu device
        const response  = await fetch('/api/data/getdevicesinfo');
        const devices = await response .json();
        const container = document.getElementById('devices-container');
        devices.forEach(device => {
            const deviceContainer = document.createElement('div');
            deviceContainer.classList.add('switch-container');

            const label = document.createElement('span');
            label.classList.add('switch-label');
            label.textContent = device.name;

            const switchLabel = document.createElement('label');
            switchLabel.classList.add('switch');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = device.status === 1; // Assume 'on' means checked

            checkbox.addEventListener('change', () => updateDeviceStatus(device.id, checkbox.checked));

            const slider = document.createElement('span');
            slider.classList.add('slider', 'round');

            switchLabel.appendChild(checkbox);
            switchLabel.appendChild(slider);
            deviceContainer.appendChild(label);
            deviceContainer.appendChild(switchLabel);
            container.appendChild(deviceContainer);
        });
    } catch (err) {
        console.error(err);
    }
});

async function updateDeviceStatus(deviceId, status) {
    try {
        const response = await fetch('/api/devices/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: deviceId,
                status: status ? 1 : 0
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const result = await response.json();
        console.log('Device status updated:', result);
    } catch (error) {
        console.error('Error updating device status:', error);
    }
}