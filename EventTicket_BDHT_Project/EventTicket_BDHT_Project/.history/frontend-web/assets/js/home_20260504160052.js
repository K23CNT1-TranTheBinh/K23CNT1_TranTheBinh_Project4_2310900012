// Home page JavaScript
// Load featured events

document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
});

async function loadEvents() {
    try {
        const eventsContainer = document.getElementById('events-container') || document.querySelector('main');
        eventsContainer.innerHTML += '<p class="loading">Đang tải sự kiện...</p>';
        
        // Public API call - no auth needed
        const response = await fetch('http://localhost:8080/api/public/events');
        const events = await response.json();
        
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        document.querySelector('main').innerHTML += '<p>Lỗi tải sự kiện. Backend chưa chạy?</p>';
    }
}

function displayEvents(events) {
    const container = document.getElementById('events-container') || document.querySelector('main');
    container.innerHTML = `
        <h2>Sự Kiện Nổi Bật</h2>
        <div id="events-list" class="events-grid"></div>
    `;
    
    const eventsList = document.getElementById('events-list');
    eventsList.innerHTML = events.map(event => `
        <div class="event-card">
            <img src="${event.imageUrl || '/assets/images/default-event.jpg'}" alt="${event.name}" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px;">
            <div>
                <h3>${event.name}</h3>
                <p>${event.venue} - ${new Date(event.date).toLocaleDateString('vi-VN')}</p>
                <p>Giá vé từ: ${event.minPrice || 'Liên hệ'} VNĐ</p>
                <button class="btn" onclick="viewEvent(${event.id})">Chi Tiết</button>
            </div>
        </div>
    `).join('');
}

function viewEvent(eventId) {
    window.location.href = `pages/user/event-detail.html?id=${eventId}`;
}

