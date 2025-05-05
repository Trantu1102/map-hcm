const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const img = document.querySelector('.map-container img');
canvas.width = img.clientWidth;
canvas.height = img.clientHeight;

const mapElement = document.getElementById('hcm-map');

let areas = [];
let locationsData = [];

fetch('provinces.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Thay đổi để lấy dữ liệu từ hcm_districts
        locationsData = data.hcm_districts;
        areas = locationsData.map(location => {
            if (!location.coords) {
                console.error('Missing coords for location:', location);
                return { coords: [], shape: 'poly' };
            }
            const coords = location.coords.split(',').map(Number);
            const shape = 'poly';
            return { coords, shape };
        });
        createMapAreas();
    })
    .catch(error => {
        console.error('Error loading the JSON file:', error);
    });

function updateCanvasSize() {
    // Cập nhật kích thước canvas theo kích thước thực của ảnh
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
    canvas.style.width = `${img.offsetWidth}px`;
    canvas.style.height = `${img.offsetHeight}px`;
}

// Sửa lại event listener resize
window.addEventListener('resize', () => {
    updateCanvasSize();
    createMapAreas();
});

// Thêm vào sau khi ảnh đã load
img.addEventListener('load', () => {
    updateCanvasSize();
    createMapAreas();
});

// Sửa lại hàm createMapAreas
function createMapAreas() {
    mapElement.innerHTML = '';
    const scaleX = img.offsetWidth / img.naturalWidth;
    const scaleY = img.offsetHeight / img.naturalHeight;
    
    areas.forEach((area) => {
        const scaledCoords = area.coords.map((val, index) => {
            return index % 2 === 0 
                ? Math.round(val * scaleX) 
                : Math.round(val * scaleY);
        });
        
        const areaElement = document.createElement('area');
        areaElement.setAttribute('shape', area.shape);
        areaElement.setAttribute('coords', scaledCoords.join(','));
        areaElement.setAttribute('href', 'javascript:void(0)');
        mapElement.appendChild(areaElement);
    });
    
    setupEventListeners();
}

const drawOutline = (coords) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    
    ctx.moveTo(coords[0] * scaleX, coords[1] * scaleY);
    for (let i = 2; i < coords.length; i += 2) {
        ctx.lineTo(coords[i] * scaleX, coords[i + 1] * scaleY);
    }
    
    ctx.closePath();
    
    // Thêm fill màu da cam nhạt
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // Màu da cam với độ trong suốt 0.3
    ctx.fill();
    
    // Vẽ viền đỏ
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
};

const clearOutline = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Tooltip functionality
const tooltip = document.querySelector('.tooltip-box');

// Sửa lại hàm showTooltip để tối ưu cho thiết bị di động
const showTooltip = (data, event) => {
    const tooltip = document.querySelector('.tooltip-box');
    tooltip.style.display = 'block';
    tooltip.style.pointerEvents = 'auto';
    
    let tooltipContent = `
        <div class="district-header">
            <h3>${data.name}</h3>
        </div>
    `;

    data.districts.forEach(district => {
        tooltipContent += `
            <div class="district-item">
                <h4>${district.name}</h4>
                <p class="description">${district.description}</p>
                <div class="stats">
                    <div class="stat">
                        <span class="icon">🗺️</span>
                        <span class="label">Diện tích:</span>
                        <span class="value">${district.area} km²</span>
                    </div>
                    <div class="stat">
                        <span class="icon">👥</span>
                        <span class="label">Dân số:</span>
                        <span class="value">${district.population} người</span>
                    </div>
                </div>
            </div>
        `;
    });

    tooltip.innerHTML = tooltipContent;

    // Kiểm tra nếu là thiết bị di động
    if (window.innerWidth <= 768) {
        // Đặt tooltip ở giữa màn hình cho thiết bị di động
        tooltip.style.position = 'fixed';
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.maxHeight = '80vh';
        tooltip.style.width = '85vw';
        tooltip.style.maxWidth = '400px';
    } else {
        // Vị trí tooltip cho desktop
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let x = event.clientX + 50;
        let y = event.clientY - tooltipRect.height / 2;

        if (x + tooltipRect.width > viewportWidth) {
            x = event.clientX - tooltipRect.width - 50;
        }

        if (y < 0) {
            y = 0;
        } else if (y + tooltipRect.height > viewportHeight) {
            y = viewportHeight - tooltipRect.height;
        }

        tooltip.style.position = 'fixed';
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        tooltip.style.transform = 'none';
        tooltip.style.maxWidth = '450px';
    }

    tooltip.classList.add('active');
};

// Thêm sự kiện click vào document để đóng tooltip
document.addEventListener('click', (event) => {
    const tooltip = document.querySelector('.tooltip-box');
    const selectedArea = document.querySelector('path[data-active="true"]');
    
    // Kiểm tra nếu click ngoài tooltip và ngoài vùng được chọn thì mới đóng
    if (!tooltip.contains(event.target) && (!selectedArea || !selectedArea.contains(event.target))) {
        tooltip.style.display = 'none';
        // Xóa trạng thái active của vùng được chọn
        if (selectedArea) {
            selectedArea.removeAttribute('data-active');
        }
    }
});

function setupEventListeners() {
    const areaElements = document.querySelectorAll('area');
    let currentArea = null;
    
    areaElements.forEach((area, index) => {
        // Chỉ xử lý sự kiện click
        area.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation(); // Ngăn chặn sự kiện click lan ra document
            
            const districtData = locationsData[index];
            
            // Nếu click vào area khác, xóa outline của area cũ
            if (currentArea && currentArea !== area) {
                clearOutline();
            }
            
            // Cập nhật area hiện tại
            currentArea = area;
            
            // Vẽ outline và hiển thị tooltip
            drawOutline(areas[index].coords);
            showTooltip(districtData, event);
        });
    });
}

// Sửa lại sự kiện click document để đóng tooltip
document.addEventListener('click', (event) => {
    const tooltip = document.querySelector('.tooltip-box');
    const areaElements = document.querySelectorAll('area');
    
    // Kiểm tra xem có click vào area hoặc tooltip không
    if (!tooltip.contains(event.target)) {
        tooltip.style.display = 'none';
        clearOutline();
    }
});