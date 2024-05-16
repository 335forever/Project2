document.addEventListener('DOMContentLoaded', async () => {
    try {
        const ctx = document.getElementById('dhtChart').getContext('2d');

        // Gọi API để lấy dữ liệu ban đầu
        const initialData = await fetch('/api/getdhtdata?nums=20');
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

        // WebSocket
        const ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = (event) => {
            const newData = JSON.parse(event.data);
            console.log(newData);
            updateChartData(newData.temperature, newData.humidity, newData.current_time);
        };
    } catch (err) {
        console.error(err);
    }
});
