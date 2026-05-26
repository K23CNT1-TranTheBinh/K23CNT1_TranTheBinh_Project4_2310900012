document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    setupVenueSearch();
    loadRecentVenues();
});

function setupVenueSearch() {
    const searchButton = document.getElementById('btn-search-venues');
    const capacityButton = document.getElementById('btn-filter-capacity');

    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            const keyword = document.getElementById('venue-keyword').value.trim();
            if (!keyword) {
                alert('Vui lòng nhập từ khóa tìm kiếm.');
                return;
            }
            await searchVenues(keyword);
        });
    }

    if (capacityButton) {
        capacityButton.addEventListener('click', async () => {
            const minCapacity = Number(document.getElementById('venue-capacity').value || 0);
            if (minCapacity <= 0) {
                alert('Nhập sức chứa tối thiểu lớn hơn 0.');
                return;
            }
            await filterVenuesByCapacity(minCapacity);
        });
    }
}

async function loadRecentVenues() {
    const results = document.getElementById('venue-results');
    if (!results) return;
    results.innerHTML = '<div class="empty-state">Đang tải danh sách địa điểm...</div>';
    try {
        const venues = await window.apiClient.get('/api/vtd/public/venues/search?keyword=');
        showVenues(venues || []);
    } catch (error) {
        results.innerHTML = `<div class="empty-state">Không thể tải dữ liệu: ${error.message}</div>`;
    }
}

async function searchVenues(keyword) {
    const results = document.getElementById('venue-results');
    if (!results) return;
    results.innerHTML = '<div class="empty-state">Đang tìm kiếm...</div>';
    try {
        const venues = await window.apiClient.get(`/api/vtd/public/venues/search?keyword=${encodeURIComponent(keyword)}`);
        showVenues(venues || []);
    } catch (error) {
        results.innerHTML = `<div class="empty-state">Lỗi tìm kiếm: ${error.message}</div>`;
    }
}

async function filterVenuesByCapacity(minCapacity) {
    const results = document.getElementById('venue-results');
    if (!results) return;
    results.innerHTML = '<div class="empty-state">Đang lọc địa điểm...</div>';
    try {
        const venues = await window.apiClient.get(`/api/vtd/public/venues/by-capacity?minCapacity=${encodeURIComponent(minCapacity)}`);
        showVenues(venues || []);
    } catch (error) {
        results.innerHTML = `<div class="empty-state">Lỗi lọc: ${error.message}</div>`;
    }
}

function showVenues(venues) {
    const results = document.getElementById('venue-results');
    if (!results) return;
    if (!venues || venues.length === 0) {
        results.innerHTML = '<div class="empty-state">Không tìm thấy địa điểm phù hợp.</div>';
        return;
    }

    results.innerHTML = venues.map(venue => {
        const title = venue.name || venue.venueName || 'Địa điểm chưa xác định';
        const address = venue.address || venue.location || 'Không có địa chỉ';
        const capacity = venue.capacity || venue.maxCapacity || 'N/A';
        const id = venue.venueId || venue.id;
        return `
            <div class="venue-card">
                <h3>${title}</h3>
                <p><strong>Địa chỉ:</strong> ${address}</p>
                <p><strong>Sức chứa:</strong> ${capacity}</p>
                <a href="${window.pageUtils.resolveUrl('pages/user/venue-detail.html?id=' + id)}" class="btn-detail">Xem chi tiết</a>
            </div>
        `;
    }).join('');
}