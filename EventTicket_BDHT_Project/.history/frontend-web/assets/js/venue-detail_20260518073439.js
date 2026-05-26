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
            <div class="venue-field"><strong>Địa chỉ:</strong> ${venue.address || venue.location || 'Chưa cập nhật'}</div>
            <div class="venue-field"><strong>Sức chứa:</strong> ${venue.capacity || venue.maxCapacity || 'Chưa cập nhật'}</div>
            <div class="venue-field"><strong>Mô tả:</strong> ${venue.description || venue.info || 'Chưa có mô tả.'}</div>
            <div class="venue-field"><strong>Bản đồ/Link:</strong> ${venue.mapLink || venue.url || 'Không có thông tin'}</div>
        `;
    } catch (error) {
        detailContent.innerHTML = `<p>Không tải được chi tiết địa điểm: ${error.message}</p>`;
    }
}
