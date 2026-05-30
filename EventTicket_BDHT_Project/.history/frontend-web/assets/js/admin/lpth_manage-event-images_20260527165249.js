const EVENT_IMAGE_API_BASE_URL = 'http://localhost:8080';

let allEvents = [];
let allImages = [];
let filteredImages = [];
let currentPage = 1;
let pageSize = 8;
let objectUrls = [];

document.addEventListener('DOMContentLoaded', () => {
    hydrateAdminHeader();
    bindEvents();
    loadInitialData();
});

function hydrateAdminHeader() {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return;

    try {
        const user = JSON.parse(currentUserStr);
        const displayName = user.fullName || 'Admin BDHT';
        document.getElementById('admin-display-name').innerText = displayName;
        document.getElementById('admin-avatar-char').innerText = displayName.charAt(0).toUpperCase();
    } catch (error) {
        console.warn('Khong the doc thong tin admin:', error);
    }
}

function bindEvents() {
    document.getElementById('searchInput')?.addEventListener('input', () => {
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('eventFilter')?.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('categoryFilter')?.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('statusFilter')?.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('pageSizeSelect')?.addEventListener('change', (event) => {
        pageSize = parseInt(event.target.value, 10) || 8;
        currentPage = 1;
        renderImages();
    });

    document.getElementById('btnOpenUploadModal')?.addEventListener('click', () => openUploadModal());
    document.getElementById('btnCloseUploadModal')?.addEventListener('click', closeUploadModal);
    document.getElementById('btnCancelUpload')?.addEventListener('click', closeUploadModal);
    document.getElementById('uploadForm')?.addEventListener('submit', handleUploadSubmit);
    document.getElementById('imageFilesInput')?.addEventListener('change', renderSelectedFilesPreview);
}

async function loadInitialData() {
    const grid = document.getElementById('imageGrid');
    if (grid) {
        grid.innerHTML = loadingMarkup('Dang tai danh sach su kien va hinh anh...');
    }

    try {
        const events = await window.apiClient.get('/api/ttb/admin/events');
        allEvents = Array.isArray(events) ? events.filter(event => event.deletedAt === null) : [];
        populateEventOptions();
        populateCategoryFilter();
        await loadImagesForEvents(allEvents);
        applyFilters();
    } catch (error) {
        console.error('Loi tai du lieu hinh anh su kien:', error);
        if (grid) {
            grid.innerHTML = emptyMarkup('Khong the tai du lieu tu may chu.', 'text-rose-500', 'fa-circle-exclamation');
        }
    }
}

async function loadImagesForEvents(events) {
    const requests = events.map(async (event) => {
        try {
            const images = await window.apiClient.get(`/api/ttb/events/${event.eventId}/images`);
            return (Array.isArray(images) ? images : []).map(image => normalizeImage(image, event));
        } catch (error) {
            console.warn(`Khong the tai anh cua su kien ${event.eventId}:`, error);
            return [];
        }
    });

    const imageGroups = await Promise.all(requests);
    allImages = imageGroups.flat().sort((a, b) => {
        const eventSort = String(a.eventTitle).localeCompare(String(b.eventTitle), 'vi');
        if (eventSort !== 0) return eventSort;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
}

function normalizeImage(image, event) {
    return {
        imageId: image.imageId,
        imageUrl: image.imageUrl || '',
        sortOrder: image.sortOrder || 0,
        createdAt: image.createdAt || '',
        eventId: event.eventId,
        eventTitle: event.title || `Su kien #${event.eventId}`,
        eventArtist: event.artistNames || '',
        categoryName: event.categoryName || '',
        status: event.status || '',
        bannerImageUrl: event.bannerImageUrl || ''
    };
}

function populateEventOptions() {
    const eventFilter = document.getElementById('eventFilter');
    const eventInput = document.getElementById('eventInput');

    const options = allEvents
        .map(event => `<option value="${event.eventId}">#${event.eventId} - ${escapeHtml(event.title || 'Khong ten')}</option>`)
        .join('');

    if (eventFilter) {
        eventFilter.innerHTML = `<option value="">Tat ca su kien</option>${options}`;
    }

    if (eventInput) {
        eventInput.innerHTML = `<option value="">-- Chon su kien --</option>${options}`;
    }
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    const categories = [...new Set(allEvents.map(event => event.categoryName).filter(Boolean))];
    categoryFilter.innerHTML = '<option value="">Tat ca danh muc</option>';
    categories.forEach(category => {
        categoryFilter.innerHTML += `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
    });
}

function applyFilters() {
    const keyword = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const eventId = document.getElementById('eventFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    filteredImages = allImages.filter(image => {
        const keywordText = [
            image.imageId,
            image.imageUrl,
            image.eventId,
            image.eventTitle,
            image.eventArtist,
            image.categoryName,
            image.status
        ].join(' ').toLowerCase();

        return (!keyword || keywordText.includes(keyword))
            && (!eventId || String(image.eventId) === eventId)
            && (!category || image.categoryName === category)
            && (!status || image.status === status);
    });

    updateStats();
    renderImages();
}

function updateStats() {
    const uniqueEventIds = new Set(allImages.map(image => image.eventId));
    setText('totalImagesStat', allImages.length);
    setText('eventsWithImagesStat', uniqueEventIds.size);
    setText('filteredImagesStat', filteredImages.length);
}

function renderImages() {
    const grid = document.getElementById('imageGrid');
    if (!grid) return;

    const totalPages = Math.ceil(filteredImages.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    if (filteredImages.length === 0) {
        grid.innerHTML = emptyMarkup('Khong tim thay hinh anh phu hop.', 'text-gray-400', 'fa-images');
        renderPagination();
        return;
    }

    const start = (currentPage - 1) * pageSize;
    const pageItems = filteredImages.slice(start, start + pageSize);

    grid.innerHTML = pageItems.map(image => {
        const imageUrl = resolveBackendAssetUrl(image.imageUrl);
        const statusBadge = buildStatusBadge(image.status);
        const createdAt = image.createdAt ? new Date(image.createdAt).toLocaleString('vi-VN') : 'Chua co ngay tao';

        return `
            <article class="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                <div class="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <img src="${imageUrl}" alt="${escapeHtml(image.eventTitle)}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=600'">
                    <span class="absolute top-3 left-3 bg-white/95 text-gray-700 text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">#${image.imageId}</span>
                    <span class="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">Thu tu ${image.sortOrder || 0}</span>
                </div>
                <div class="p-4">
                    <div class="flex items-start justify-between gap-3 mb-3">
                        <div class="min-w-0">
                            <h3 class="font-extrabold text-gray-900 text-sm leading-snug truncate" title="${escapeHtml(image.eventTitle)}">${escapeHtml(image.eventTitle)}</h3>
                            <p class="text-xs text-gray-400 font-semibold mt-1">Su kien ID: ${image.eventId}</p>
                        </div>
                        ${statusBadge}
                    </div>
                    <p class="text-xs text-gray-500 font-medium truncate mb-1" title="${escapeHtml(image.imageUrl)}">${escapeHtml(image.imageUrl)}</p>
                    <p class="text-xs text-gray-400 font-semibold mb-4">${createdAt}</p>
                    <div class="flex items-center justify-end gap-2">
                        <button type="button" onclick="openReplaceModal(${image.imageId})" class="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 transition">
                            <i class="fa-solid fa-rotate mr-1"></i> Thay anh
                        </button>
                        <button type="button" onclick="deleteImage(${image.eventId}, ${image.imageId})" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 transition">
                            <i class="fa-solid fa-trash-can mr-1"></i> Xoa
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    renderPagination();
}

function renderPagination() {
    const bar = document.getElementById('paginationBar');
    if (!bar) return;

    const totalItems = filteredImages.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    bar.innerHTML = `
        <div class="text-xs text-gray-500 font-semibold">
            Hien thi <span class="text-slate-800 font-extrabold">${startIdx}</span> den <span class="text-slate-800 font-extrabold">${endIdx}</span> trong <span class="text-indigo-600 font-extrabold">${totalItems}</span> anh
        </div>
        <div class="flex items-center gap-2">
            <button type="button" id="btnPrevPage" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition">
                <i class="fa-solid fa-chevron-left mr-1"></i> Truoc
            </button>
            <span class="text-xs font-bold text-gray-700 mx-2">Trang ${currentPage} / ${totalPages}</span>
            <button type="button" id="btnNextPage" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition">
                Sau <i class="fa-solid fa-chevron-right ml-1"></i>
            </button>
        </div>
    `;

    document.getElementById('btnPrevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderImages();
        }
    });

    document.getElementById('btnNextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderImages();
        }
    });
}

function openUploadModal(defaultEventId = '') {
    document.getElementById('uploadModalTitle').innerText = 'Them anh su kien';
    document.getElementById('uploadModalHint').innerText = 'Chon mot su kien va co the upload nhieu file anh.';
    document.getElementById('btnSubmitUpload').innerText = 'Upload anh';
    document.getElementById('replaceImageId').value = '';
    document.getElementById('uploadForm').reset();
    document.getElementById('eventInput').disabled = false;
    document.getElementById('imageFilesInput').multiple = true;
    document.getElementById('imageFilesInput').required = true;
    document.getElementById('selectedFilesPreview').innerHTML = '';

    if (defaultEventId) {
        document.getElementById('eventInput').value = String(defaultEventId);
    }

    document.getElementById('uploadModal').classList.remove('hidden');
}

function openReplaceModal(imageId) {
    const image = allImages.find(item => item.imageId === imageId);
    if (!image) return;

    openUploadModal(image.eventId);
    document.getElementById('uploadModalTitle').innerText = 'Thay anh su kien';
    document.getElementById('uploadModalHint').innerText = `Anh #${image.imageId} se duoc xoa sau khi upload anh moi thanh cong.`;
    document.getElementById('btnSubmitUpload').innerText = 'Thay anh';
    document.getElementById('replaceImageId').value = String(image.imageId);
    document.getElementById('eventInput').disabled = true;
    document.getElementById('imageFilesInput').multiple = false;
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
}

function renderSelectedFilesPreview() {
    const preview = document.getElementById('selectedFilesPreview');
    const files = Array.from(document.getElementById('imageFilesInput')?.files || []);
    if (!preview) return;

    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];

    preview.innerHTML = files.map(file => {
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        return `
            <div class="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                <img src="${url}" class="w-full aspect-square object-cover" alt="${escapeHtml(file.name)}">
                <p class="px-2 py-1.5 text-[11px] text-gray-500 font-semibold truncate" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
            </div>
        `;
    }).join('');
}

async function handleUploadSubmit(event) {
    event.preventDefault();

    const eventId = document.getElementById('eventInput').value;
    const replaceImageId = document.getElementById('replaceImageId').value;
    const files = Array.from(document.getElementById('imageFilesInput').files || []);

    if (!eventId) {
        alert('Vui long chon su kien.');
        return;
    }

    if (files.length === 0) {
        alert('Vui long chon file anh.');
        return;
    }

    if (replaceImageId && files.length !== 1) {
        alert('Khi thay anh, vui long chi chon 1 file.');
        return;
    }

    const submitButton = document.getElementById('btnSubmitUpload');
    const originalText = submitButton.innerText;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-1"></i> Dang xu ly...';

    try {
        if (replaceImageId) {
            const currentCount = allImages.filter(image => String(image.eventId) === String(eventId)).length;
            if (currentCount >= 10) {
                await deleteImageRequest(eventId, replaceImageId);
                await uploadImage(eventId, files[0]);
            } else {
                await uploadImage(eventId, files[0]);
                await deleteImageRequest(eventId, replaceImageId);
            }
        } else {
            for (const file of files) {
                await uploadImage(eventId, file);
            }
        }

        alert(replaceImageId ? 'Da thay anh thanh cong!' : 'Da upload anh thanh cong!');
        closeUploadModal();
        await refreshImages();
    } catch (error) {
        console.error('Loi upload anh:', error);
        alert(`Khong the upload anh: ${error.message || 'Vui long thu lai.'}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerText = originalText;
    }
}

async function uploadImage(eventId, file) {
    const token = window.apiClient.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${EVENT_IMAGE_API_BASE_URL}/api/ttb/events/${eventId}/images`, {
        method: 'POST',
        headers,
        body: formData
    });

    const text = await response.text();
    let data = text;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        data = text;
    }

    if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : (data.message || `HTTP ${response.status}`));
    }

    return data;
}

async function deleteImage(eventId, imageId) {
    if (!confirm('Ban thuc su muon xoa anh nay? File vat ly cung se bi xoa tren backend.')) return;

    try {
        await deleteImageRequest(eventId, imageId);
        alert('Da xoa anh thanh cong!');
        await refreshImages();
    } catch (error) {
        console.error('Loi xoa anh:', error);
        alert(`Khong the xoa anh: ${error.message || 'Vui long thu lai.'}`);
    }
}

async function deleteImageRequest(eventId, imageId) {
    return window.apiClient.delete(`/api/ttb/events/${eventId}/images/${imageId}`);
}

async function refreshImages() {
    await loadImagesForEvents(allEvents);
    applyFilters();
}

function buildStatusBadge(status) {
    if (status === 'PUBLISHED') {
        return '<span class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[11px] font-black border border-emerald-100 whitespace-nowrap">Mo ban</span>';
    }

    if (status === 'DRAFT') {
        return '<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-[11px] font-black border border-gray-200 whitespace-nowrap">Ban nhap</span>';
    }

    return '<span class="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg text-[11px] font-black border border-rose-100 whitespace-nowrap">Da huy</span>';
}

function resolveBackendAssetUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return `${EVENT_IMAGE_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

function loadingMarkup(message) {
    return `
        <div class="col-span-full px-6 py-16 text-center text-gray-400">
            <i class="fa-solid fa-spinner animate-spin text-2xl mb-2 block"></i>
            ${escapeHtml(message)}
        </div>
    `;
}

function emptyMarkup(message, colorClass, iconClass) {
    return `
        <div class="col-span-full px-6 py-16 text-center ${colorClass}">
            <i class="fa-solid ${iconClass} text-3xl mb-3 block"></i>
            <p class="text-sm font-bold">${escapeHtml(message)}</p>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
