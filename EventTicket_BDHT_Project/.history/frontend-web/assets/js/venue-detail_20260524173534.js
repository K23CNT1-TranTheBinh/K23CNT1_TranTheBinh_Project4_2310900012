document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    loadVenueDetails();
});

async function loadVenueDetails() {
    const params = new URLSearchParams(window.location.search);
    const venueId = params.get('id');
    const detailContent = document.getElementById('detail-content');

    if (!venueId || !detailContent) {
        if (detailContent) {
            detailContent.innerHTML = '<p>Không tìm thấy mã địa điểm.</p>';
        }
        return;
    }

    try {
        const venue = await window.apiClient.get(`/api/vtd/public/venues/${venueId}`);
        if (!venue) {
            throw new Error('Không có thông tin địa điểm.');
        }

        detailContent.innerHTML = `
            <h1>${venue.name || venue.venueName || 'Địa điểm chưa xác định'}</h1>
            <div class="venue-info-grid">
                <div class="venue-field">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <div class="label">Địa chỉ:</div>
                        <div class="value">${venue.address || venue.location || 'Chưa cập nhật'}</div>
                    </div>
                </div>
                <div class="venue-field">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="label">Sức chứa:</div>
                        <div class="value">${venue.capacity || venue.maxCapacity || 'Chưa cập nhật'} người</div>
                    </div>
                </div>
                <div class="venue-field">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <div class="label">Mô tả:</div>
                        <div class="value">${venue.description || venue.info || 'Chưa có mô tả.'}</div>
                    </div>
                </div>
                <div class="venue-field">
                    <i class="fas fa-map"></i>
                    <div>
                        <div class="label">Bản đồ:</div>
                        <div class="value">
                            ${(venue.mapLink || venue.url) 
                                ? `<a href="${venue.mapLink || venue.url}" target="_blank" class="text-blue-500 hover:underline">Xem trên Google Maps</a>` 
                                : 'Không có thông tin'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Tải các sự kiện diễn ra tại đây
        await loadEventsForVenue(venueId);

    } catch (error) {
        detailContent.innerHTML = `
            <div class="text-center py-10">
                <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <p class="text-red-500 font-bold mb-2">Không tải được chi tiết địa điểm</p>
                <p class="text-gray-500 text-sm">${error.message}</p>
            </div>
        `;
    }
}

async function loadEventsForVenue(venueId) {
    const section = document.getElementById('venue-events-section');
    const grid = document.getElementById('venue-events-grid');
    const emptyState = document.getElementById('venue-events-empty');
    
    if (!section || !grid) return;
    section.classList.remove('hidden');
    grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin mr-2"></i> Đang tải sự kiện...</div>';
    
    try {
        // Gọi API public events (mặc định lấy page 0, size lớn để filter locally)
        const response = await window.apiClient.getPublicEvents({ page: 0, size: 100 });
        const allEvents = response.content || response || [];
        
        // Lọc các sự kiện có venue khớp với venueId hiện tại
        const venueEvents = allEvents.filter(e => {
            if (!e.venue) return false;
            const eVenueId = e.venue.venueId || e.venue.id;
            return String(eVenueId) === String(venueId);
        });
        
        if (venueEvents.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        grid.innerHTML = venueEvents.map(event => {
            const dateStr = event.startDate ? new Date(event.startDate).toLocaleDateString('vi-VN') : 'Sắp diễn ra';
            const detailUrl = window.pageUtils.resolveUrl(`pages/user/event-detail.html?id=${event.eventId || event.id}`);
            const imageUrl = event.bannerImageUrl || event.imageUrl || event.bannerImage || '';
            const imageHtml = imageUrl
                ? `<img src="${imageUrl}" alt="${event.title || 'Sự kiện'}" class="event-img">`
                : `<div class="event-img flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-orange-400" style="min-height:180px;">
                     <i class="fas fa-image text-2xl"></i>
                   </div>`;

            return `
                <div class="event-card">
                    ${imageHtml}
                    <div class="event-content">
                        <div class="event-title">${event.title || 'Sự kiện'}</div>
                        <div class="event-date"><i class="far fa-calendar-alt text-brand-orange mr-1"></i> ${dateStr}</div>
                        <a href="${detailUrl}" class="event-btn">Xem chi tiết</a>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error("Lỗi khi tải sự kiện:", error);
        grid.innerHTML = '<div class="col-span-full text-center text-red-500 py-6">Không thể tải danh sách sự kiện.</div>';
    }
}