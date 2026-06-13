/**
 * Tailnet Drive - SPA Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentPath = '';
    let currentFolders = [];
    let currentFiles = [];
    let selectedItem = null;
    let viewMode = 'grid'; // 'grid' or 'list'
    let activeTab = 'my-drive'; // 'my-drive', 'recent', 'favorites'
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;

    // Load favorites from local storage
    let favorites = JSON.parse(localStorage.getItem('tailnet_drive_favorites') || '[]');

    // --- DOM Elements ---
    const foldersContainer = document.getElementById('folders-container');
    const filesContainer = document.getElementById('files-container');
    const foldersSection = document.getElementById('folders-section');
    const filesSection = document.getElementById('files-section');
    const emptyState = document.getElementById('empty-state');
    const breadcrumbsContainer = document.getElementById('breadcrumbs-container');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const loader = document.getElementById('loader');
    
    // Sidebar Navigation
    const navMyDrive = document.getElementById('nav-my-drive');
    const navRecent = document.getElementById('nav-recent');
    const navFavorites = document.getElementById('nav-favorites');
    
    // Toolbar Actions
    const sortSelect = document.getElementById('sort-select');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const listHeaders = document.getElementById('list-headers');
    const filesTitle = document.getElementById('files-title');
    const foldersTitle = document.getElementById('folders-title');
    
    // Details Panel
    const detailSidebar = document.getElementById('detail-sidebar');
    const infoToggleBtn = document.getElementById('info-toggle');
    const closeDetailBtn = document.getElementById('close-detail');
    const detailEmptyState = document.getElementById('detail-empty-state');
    const detailInfoState = document.getElementById('detail-info-state');
    const detailPreview = document.getElementById('detail-preview');
    const detailTitle = document.getElementById('detail-title');
    const propType = document.getElementById('prop-type');
    const propSize = document.getElementById('prop-size');
    const propDimensions = document.getElementById('prop-dimensions');
    const propDimensionsRow = document.getElementById('prop-dimensions-row');
    const propLocation = document.getElementById('prop-location');
    const propModified = document.getElementById('prop-modified');
    const detailDownloadBtn = document.getElementById('detail-download-btn');
    
    // Lightbox Modal
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const lightboxAudio = document.getElementById('lightbox-audio');
    const lightboxFilename = document.getElementById('lightbox-filename');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxZoomIn = document.getElementById('lightbox-zoom-in');
    const lightboxZoomOut = document.getElementById('lightbox-zoom-out');
    const lightboxDownload = document.getElementById('lightbox-download');
    const lightboxImgWrapper = document.getElementById('lightbox-img-wrapper');
    const themeToggle = document.getElementById('theme-toggle');

    // --- Helper Functions ---
    
    // Get premium vector SVG icons based on file mime type
    function getFileIcon(mimeType, isImage, isSmall = false) {
        const mime = mimeType || '';
        const widthHeight = isSmall ? 16 : 48;
        const strokeWidth = isSmall ? 2 : 1.5;
        
        if (isImage || mime.startsWith('image/')) {
            return `
                <svg class="${isSmall ? 'file-card-icon' : 'file-card-placeholder-icon'}" viewBox="0 0 24 24" width="${widthHeight}" height="${widthHeight}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
            `;
        } else if (mime.startsWith('video/')) {
            return `
                <svg class="${isSmall ? 'file-card-icon' : 'file-card-placeholder-icon'}" viewBox="0 0 24 24" width="${widthHeight}" height="${widthHeight}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
            `;
        } else if (mime.startsWith('audio/')) {
            return `
                <svg class="${isSmall ? 'file-card-icon' : 'file-card-placeholder-icon'}" viewBox="0 0 24 24" width="${widthHeight}" height="${widthHeight}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                </svg>
            `;
        } else {
            return `
                <svg class="${isSmall ? 'file-card-icon' : 'file-card-placeholder-icon'}" viewBox="0 0 24 24" width="${widthHeight}" height="${widthHeight}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
            `;
        }
    }

    // Set loader visibility
    function setLoader(show) {
        loader.style.display = show ? 'block' : 'none';
    }

    // Convert bytes to readable string
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Save favorites to local storage
    function saveFavorites() {
        localStorage.setItem('tailnet_drive_favorites', JSON.stringify(favorites));
    }

    // Check if item path is starred
    function isStarred(path) {
        return favorites.includes(path);
    }

    // Toggle star on a file
    function toggleStar(path, event) {
        if (event) event.stopPropagation();
        
        const index = favorites.indexOf(path);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(path);
        }
        saveFavorites();
        
        // Rerender view
        renderExplorer();
        
        // Update details panel if open
        if (selectedItem && selectedItem.path === path) {
            updateDetailsPanel(selectedItem);
        }
    }

    // --- Data Fetching ---
    
    // Load directories from FastAPI
    async function loadDirectory(path) {
        setLoader(true);
        try {
            const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
            if (!response.ok) throw new Error('Failed to load directory');
            
            const data = await response.json();
            currentPath = data.current_path;
            currentFolders = data.folders;
            currentFiles = data.files;
            
            selectedItem = null;
            updateDetailsPanel(null);
            renderBreadcrumbs(data.breadcrumbs);
            renderExplorer();
        } catch (error) {
            console.error('Error fetching files:', error);
            alert('Error loading directory. Returning to home.');
            if (currentPath !== '') {
                navigateTo('');
            }
        } finally {
            setLoader(false);
        }
    }

    // Navigate using browser history routing
    function navigateTo(path) {
        history.pushState({ path: path }, '', '/' + path);
        loadDirectory(path);
    }

    // --- Rendering Functions ---

    // Render breadcrumbs navigation
    function renderBreadcrumbs(breadcrumbs) {
        breadcrumbsContainer.innerHTML = '';
        breadcrumbs.forEach((bc, idx) => {
            if (idx > 0) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-separator';
                sep.textContent = '>';
                breadcrumbsContainer.appendChild(sep);
            }
            
            const item = document.createElement('span');
            item.className = 'breadcrumb-item' + (idx === breadcrumbs.length - 1 ? ' active' : '');
            item.textContent = bc.name;
            if (idx < breadcrumbs.length - 1) {
                item.addEventListener('click', () => {
                    activeTab = 'my-drive';
                    updateNavActiveState();
                    navigateTo(bc.path);
                });
            }
            breadcrumbsContainer.appendChild(item);
        });
    }

    // Render folders and files
    function renderExplorer() {
        foldersContainer.innerHTML = '';
        filesContainer.innerHTML = '';
        
        let displayFolders = [...currentFolders];
        let displayFiles = [...currentFiles];

        // Filter based on Tab
        if (activeTab === 'favorites') {
            displayFolders = [];
            displayFiles = displayFiles.filter(f => isStarred(f.path));
            filesTitle.textContent = 'Starred Files';
            foldersSection.style.display = 'none';
        } else if (activeTab === 'recent') {
            // Sort folders and files by modified time descending for recent
            displayFolders.sort((a, b) => b.timestamp - a.timestamp);
            displayFiles.sort((a, b) => b.timestamp - a.timestamp);
            foldersTitle.textContent = 'Recent Folders';
            filesTitle.textContent = 'Recent Files';
            foldersSection.style.display = displayFolders.length > 0 ? 'block' : 'none';
        } else {
            foldersTitle.textContent = 'Folders';
            filesTitle.textContent = 'Files';
            foldersSection.style.display = displayFolders.length > 0 ? 'block' : 'none';
        }

        // Apply Search Filter (if query is present)
        const query = searchInput.value.toLowerCase().trim();
        if (query) {
            displayFolders = displayFolders.filter(f => f.name.toLowerCase().includes(query));
            displayFiles = displayFiles.filter(f => f.name.toLowerCase().includes(query));
            foldersSection.style.display = displayFolders.length > 0 ? 'block' : 'none';
        }

        // Apply Custom Sorting (only if not on "Recent" tab)
        if (activeTab !== 'recent') {
            const sortBy = sortSelect.value;
            const sortFn = (a, b) => {
                if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
                if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
                if (sortBy === 'date_desc') return b.timestamp - a.timestamp;
                if (sortBy === 'date_asc') return a.timestamp - b.timestamp;
                if (sortBy === 'size_desc') return (b.size_bytes || 0) - (a.size_bytes || 0);
                if (sortBy === 'size_asc') return (a.size_bytes || 0) - (b.size_bytes || 0);
                return 0;
            };
            displayFolders.sort(sortFn);
            displayFiles.sort(sortFn);
        }

        // Check empty state
        const totalItems = displayFolders.length + displayFiles.length;
        if (totalItems === 0) {
            emptyState.style.display = 'flex';
            filesSection.style.display = 'none';
            return;
        } else {
            emptyState.style.display = 'none';
            filesSection.style.display = displayFiles.length > 0 || viewMode === 'list' ? 'block' : 'none';
        }

        // Apply layout CSS class
        if (viewMode === 'list') {
            filesContainer.className = 'files-container list-layout';
            listHeaders.style.display = displayFiles.length > 0 ? 'flex' : 'none';
        } else {
            filesContainer.className = 'files-container grid-layout';
            listHeaders.style.display = 'none';
        }

        // Render Folders
        displayFolders.forEach(folder => {
            const card = document.createElement('div');
            card.className = 'folder-card' + (selectedItem && selectedItem.path === folder.path ? ' selected' : '');
            
            card.innerHTML = `
                <svg class="folder-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
                <span class="folder-name" title="${folder.name}">${folder.name}</span>
            `;
            
            // Interaction
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                selectItem(folder, card);
            });
            
            card.addEventListener('dblclick', () => {
                navigateTo(folder.path);
            });
            
            foldersContainer.appendChild(card);
        });

        // Render Files
        displayFiles.forEach(file => {
            const card = document.createElement('div');
            card.className = 'file-card' + (selectedItem && selectedItem.path === file.path ? ' selected' : '');
            
            const starredClass = isStarred(file.path) ? 'starred' : '';
            const mime = file.mime_type || '';
            
            if (viewMode === 'grid') {
                // Grid Card HTML
                let thumbnailHtml = getFileIcon(file.mime_type, file.is_image);
                
                if (file.is_image) {
                    thumbnailHtml = `<img src="/api/thumbnail/${encodeURIComponent(file.path)}" alt="${file.name}" class="file-thumbnail" loading="lazy">`;
                }

                card.innerHTML = `
                    <div class="file-thumbnail-box">
                        ${thumbnailHtml}
                        <button class="file-card-star ${starredClass}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="file-card-info">
                        <div class="file-name-row">
                            ${getFileIcon(file.mime_type, file.is_image, true)}
                            <span class="file-card-name" title="${file.name}">${file.name}</span>
                        </div>
                        <div class="file-card-meta">
                            <span>${file.size}</span>
                            <span>${file.modified.split(',')[0]}</span>
                        </div>
                    </div>
                `;
            } else {
                // List Row HTML
                let thumbnailHtml = getFileIcon(file.mime_type, file.is_image, true);
                
                if (file.is_image) {
                    thumbnailHtml = `<img src="/api/thumbnail/${encodeURIComponent(file.path)}?width=40&height=40" alt="${file.name}" class="file-thumbnail" loading="lazy">`;
                }

                card.innerHTML = `
                    <button class="file-card-star ${starredClass}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                    <div class="file-thumbnail-box">
                        ${thumbnailHtml}
                    </div>
                    <div class="file-card-info">
                        <div class="file-name-row">
                            <span class="file-card-name" title="${file.name}">${file.name}</span>
                        </div>
                    </div>
                    <div class="file-card-meta">
                        <div class="file-modified-cell">${file.modified}</div>
                        <div class="file-size-cell">${file.size}</div>
                    </div>
                `;

                // Wire up star click inside List Row
                const starBtn = card.querySelector('.file-card-star');
                starBtn.addEventListener('click', (e) => {
                    toggleStar(file.path, e);
                });
            }

            // Wire up star click inside Grid Card
            if (viewMode === 'grid') {
                const starBtn = card.querySelector('.file-card-star');
                starBtn.addEventListener('click', (e) => {
                    toggleStar(file.path, e);
                });
            }

            // Interaction
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                selectItem(file, card);
            });
            
            card.addEventListener('dblclick', () => {
                if (file.is_image || mime.startsWith('video/') || mime.startsWith('audio/')) {
                    openLightbox(file);
                } else {
                    // Download directly
                    window.open(`/api/raw/${encodeURIComponent(file.path)}`);
                }
            });
            
            filesContainer.appendChild(card);
        });
    }

    // Select Item and highlight it
    function selectItem(item, element) {
        selectedItem = item;
        
        // Remove active class from all card elements
        document.querySelectorAll('.file-card, .folder-card').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add active class to clicked card
        if (element) {
            element.classList.add('selected');
        }
        
        // Update details panel
        updateDetailsPanel(item);
    }

    // Update Details sidebar pane
    function updateDetailsPanel(item) {
        if (!item) {
            detailEmptyState.style.display = 'flex';
            detailInfoState.style.display = 'none';
            return;
        }
        
        detailEmptyState.style.display = 'none';
        detailInfoState.style.display = 'flex';
        
        detailTitle.textContent = item.name;
        detailTitle.title = item.name;
        
        const isFolder = !item.hasOwnProperty('size_bytes');
        
        if (isFolder) {
            detailPreview.innerHTML = `
                <svg class="detail-preview-icon" viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style="color: #f59e0b;">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
            `;
            propType.textContent = 'Folder';
            propSize.textContent = '--';
            propDimensionsRow.style.display = 'none';
            propLocation.textContent = '/' + item.path.split('/').slice(0, -1).join('/');
            propModified.textContent = item.modified;
            detailDownloadBtn.style.display = 'none';
        } else {
            // File Detail
            const mime = item.mime_type || '';
            if (item.is_image) {
                detailPreview.innerHTML = `<img src="/api/thumbnail/${encodeURIComponent(item.path)}?width=300&height=200" alt="${item.name}" class="detail-preview-img">`;
                propType.textContent = item.mime_type.split('/')[1].toUpperCase() + ' Image';
                
                if (item.width && item.height) {
                    propDimensionsRow.style.display = 'flex';
                    propDimensions.textContent = `${item.width} x ${item.height}`;
                } else {
                    propDimensionsRow.style.display = 'none';
                }
            } else if (mime.startsWith('video/')) {
                detailPreview.innerHTML = `
                    <video src="/api/raw/${encodeURIComponent(item.path)}" controls class="detail-preview-img" style="object-fit: contain; background: black;"></video>
                `;
                propType.textContent = 'Video File';
                propDimensionsRow.style.display = 'none';
            } else if (mime.startsWith('audio/')) {
                detailPreview.innerHTML = `
                    <audio src="/api/raw/${encodeURIComponent(item.path)}" controls style="width: 100%; max-width: 250px;"></audio>
                `;
                propType.textContent = 'Audio File';
                propDimensionsRow.style.display = 'none';
            } else {
                detailPreview.innerHTML = `
                    <svg class="detail-preview-icon" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                `;
                propType.textContent = 'Binary File';
                propDimensionsRow.style.display = 'none';
            }
            
            propSize.textContent = item.size;
            propLocation.textContent = '/' + item.path.split('/').slice(0, -1).join('/');
            propModified.textContent = item.modified;
            
            detailDownloadBtn.style.display = 'inline-flex';
            detailDownloadBtn.href = `/api/raw/${encodeURIComponent(item.path)}`;
        }
    }

    // Update Sidebar navigation active state
    function updateNavActiveState() {
        navMyDrive.classList.remove('active');
        navRecent.classList.remove('active');
        navFavorites.classList.remove('active');
        
        if (activeTab === 'my-drive') navMyDrive.classList.add('active');
        if (activeTab === 'recent') navRecent.classList.add('active');
        if (activeTab === 'favorites') navFavorites.classList.add('active');
    }

    // --- Lightbox / Preview Logic ---

    // Get list of active images/media in the view to enable sliding next/prev
    function getActiveImages() {
        const query = searchInput.value.toLowerCase().trim();
        let list = [...currentFiles].filter(f => {
            const mime = f.mime_type || '';
            return f.is_image || mime.startsWith('video/') || mime.startsWith('audio/');
        });
        
        if (activeTab === 'favorites') {
            list = list.filter(f => isStarred(f.path));
        } else if (activeTab === 'recent') {
            list.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        if (query) {
            list = list.filter(f => f.name.toLowerCase().includes(query));
        }
        
        return list;
    }

    let lightboxActiveImages = [];
    let lightboxIndex = -1;

    function openLightbox(file) {
        lightboxActiveImages = getActiveImages();
        lightboxIndex = lightboxActiveImages.findIndex(img => img.path === file.path);
        
        if (lightboxIndex === -1) return;
        
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        renderLightboxImage();
        lightbox.classList.add('open');
    }

    function renderLightboxImage() {
        if (lightboxIndex < 0 || lightboxIndex >= lightboxActiveImages.length) return;
        
        const file = lightboxActiveImages[lightboxIndex];
        const mime = file.mime_type || '';
        
        lightboxFilename.textContent = file.name;
        lightboxDownload.href = `/api/raw/${encodeURIComponent(file.path)}`;
        
        // Pause and reset previous media
        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxVideo.style.display = 'none';
        
        lightboxAudio.pause();
        lightboxAudio.src = '';
        lightboxAudio.style.display = 'none';
        
        lightboxImg.src = '';
        lightboxImg.style.display = 'none';
        
        if (file.is_image) {
            const totalPixels = (file.width || 0) * (file.height || 0);
            const rawUrl = `/api/raw/${encodeURIComponent(file.path)}`;
            const thumbUrl = `/api/thumbnail/${encodeURIComponent(file.path)}?width=1280&height=800`;
            
            // Render low-res preview thumbnail first for instant loading, or raw immediately for small files
            if (totalPixels > 0 && totalPixels < 1200000) {
                lightboxImg.src = rawUrl;
                lightboxImg.dataset.loadedFidelity = 'raw';
            } else {
                lightboxImg.src = thumbUrl;
                lightboxImg.dataset.loadedFidelity = 'thumbnail';
            }
            
            lightboxImg.style.display = 'block';
            lightboxZoomIn.style.display = 'inline-flex';
            lightboxZoomOut.style.display = 'inline-flex';
        } else if (mime.startsWith('video/')) {
            lightboxVideo.src = `/api/raw/${encodeURIComponent(file.path)}`;
            lightboxVideo.style.display = 'block';
            lightboxZoomIn.style.display = 'none';
            lightboxZoomOut.style.display = 'none';
            lightboxVideo.play().catch(e => console.log('Autoplay prevented:', e));
        } else if (mime.startsWith('audio/')) {
            lightboxAudio.src = `/api/raw/${encodeURIComponent(file.path)}`;
            lightboxAudio.style.display = 'block';
            lightboxZoomIn.style.display = 'none';
            lightboxZoomOut.style.display = 'none';
            lightboxAudio.play().catch(e => console.log('Autoplay prevented:', e));
        }
        
        // Hide/Show arrows
        lightboxPrev.style.visibility = lightboxIndex > 0 ? 'visible' : 'hidden';
        lightboxNext.style.visibility = lightboxIndex < lightboxActiveImages.length - 1 ? 'visible' : 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        lightboxImg.src = '';
        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxAudio.pause();
        lightboxAudio.src = '';
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        resetZoom();
    }

    function navigateLightbox(direction) {
        if (direction === 'next' && lightboxIndex < lightboxActiveImages.length - 1) {
            lightboxIndex++;
            renderLightboxImage();
        } else if (direction === 'prev' && lightboxIndex > 0) {
            lightboxIndex--;
            renderLightboxImage();
        }
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        resetZoom();
    }

    function resetZoom() {
        lightboxImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }

    function upgradeImageFidelity() {
        if (!lightbox.classList.contains('open')) return;
        const file = lightboxActiveImages[lightboxIndex];
        if (file && file.is_image && lightboxImg.dataset.loadedFidelity === 'thumbnail') {
            lightboxImg.src = `/api/raw/${encodeURIComponent(file.path)}`;
            lightboxImg.dataset.loadedFidelity = 'raw';
        }
    }

    // --- Event Listeners ---

    // Sidebar navigation clicks
    navMyDrive.addEventListener('click', (e) => {
        e.preventDefault();
        activeTab = 'my-drive';
        updateNavActiveState();
        navigateTo(currentPath);
    });

    navRecent.addEventListener('click', (e) => {
        e.preventDefault();
        activeTab = 'recent';
        updateNavActiveState();
        renderExplorer();
    });

    navFavorites.addEventListener('click', (e) => {
        e.preventDefault();
        activeTab = 'favorites';
        updateNavActiveState();
        renderExplorer();
    });

    // Toolbar sorting & layout adjustments
    sortSelect.addEventListener('change', renderExplorer);
    
    gridViewBtn.addEventListener('click', () => {
        viewMode = 'grid';
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        renderExplorer();
    });

    listViewBtn.addEventListener('click', () => {
        viewMode = 'list';
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        renderExplorer();
    });

    // Real-time Search Input filtering
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearSearchBtn.style.display = query.length > 0 ? 'flex' : 'none';
        renderExplorer();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        renderExplorer();
    });

    // Details sidebar toggles
    infoToggleBtn.addEventListener('click', () => {
        infoToggleBtn.classList.toggle('active');
        detailSidebar.classList.toggle('closed');
    });

    closeDetailBtn.addEventListener('click', () => {
        infoToggleBtn.classList.remove('active');
        detailSidebar.classList.add('closed');
    });

    // Document click: clear selection when clicking background
    document.addEventListener('click', () => {
        selectedItem = null;
        updateDetailsPanel(null);
        document.querySelectorAll('.file-card, .folder-card').forEach(el => {
            el.classList.remove('selected');
        });
    });

    // Lightbox Control Listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', () => navigateLightbox('prev'));
    lightboxNext.addEventListener('click', () => navigateLightbox('next'));
    
    lightboxZoomIn.addEventListener('click', () => {
        if (zoomLevel < 4) {
            lightboxImg.style.transition = 'transform 0.2s ease';
            zoomLevel += 0.5;
            resetZoom();
            if (zoomLevel > 1) upgradeImageFidelity();
        }
    });

    lightboxZoomOut.addEventListener('click', () => {
        if (zoomLevel > 0.5) {
            lightboxImg.style.transition = 'transform 0.2s ease';
            zoomLevel -= 0.5;
            if (zoomLevel <= 1) {
                panX = 0;
                panY = 0;
            }
            resetZoom();
        }
    });

    // Lightbox click backdrop to close
    lightbox.addEventListener('click', (e) => {
        if (e.target.classList.contains('lightbox-view-area') || e.target.classList.contains('lightbox-img-wrapper')) {
            closeLightbox();
        }
    });

    // --- Lightbox Gestures (Touch & Mouse) ---
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialPanX = 0;
    let initialPanY = 0;

    // Pinch to zoom state
    let initialDistance = 0;
    let initialZoom = 1;

    // Swipe to browse state
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 50;

    // Double tap state
    let lastTap = 0;

    function handleStart(clientX, clientY) {
        if (zoomLevel > 1) {
            isDragging = true;
            startX = clientX;
            startY = clientY;
            initialPanX = panX;
            initialPanY = panY;
            lightboxImg.style.transition = 'none'; // disable transition while dragging
        }
    }

    function handleMove(clientX, clientY) {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        panX = initialPanX + dx;
        panY = initialPanY + dy;

        // Keep panning within screen bounds to prevent dragging image completely off
        const boundsX = (window.innerWidth * (zoomLevel - 1)) / 2 + 100;
        const boundsY = (window.innerHeight * (zoomLevel - 1)) / 2 + 100;
        panX = Math.max(-boundsX, Math.min(boundsX, panX));
        panY = Math.max(-boundsY, Math.min(boundsY, panY));

        resetZoom();
    }

    function handleEnd() {
        if (isDragging) {
            isDragging = false;
            lightboxImg.style.transition = 'transform 0.2s ease';
        }
    }

    function getDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Touch event listeners on image wrapper
    lightboxImgWrapper.addEventListener('touchstart', (e) => {
        // Double-tap zoom check
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            lightboxImg.style.transition = 'transform 0.2s ease';
            if (zoomLevel > 1) {
                zoomLevel = 1;
                panX = 0;
                panY = 0;
            } else {
                zoomLevel = 2.5;
                panX = 0;
                panY = 0;
                upgradeImageFidelity();
            }
            resetZoom();
            lastTap = 0;
            return;
        }
        lastTap = currentTime;

        if (e.touches.length === 1) {
            // Drag/Pan start or Swipe start
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
            if (zoomLevel === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        } else if (e.touches.length === 2) {
            // Pinch zoom start
            isDragging = false;
            initialDistance = getDistance(e.touches[0], e.touches[1]);
            initialZoom = zoomLevel;
            lightboxImg.style.transition = 'none';
        }
    }, { passive: false });

    // Document-level touchmove and touchend for robust touchscreen dragging and pinch zooming
    document.addEventListener('touchmove', (e) => {
        if (!lightbox.classList.contains('open')) return;

        if (e.touches.length === 1) {
            // Prevent browser scroll and history swipe navigation at the page level
            if (e.cancelable) e.preventDefault();
            
            if (isDragging) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        } else if (e.touches.length === 2 && initialDistance > 0) {
            if (e.cancelable) e.preventDefault();
            const dist = getDistance(e.touches[0], e.touches[1]);
            const factor = dist / initialDistance;
            zoomLevel = Math.max(0.5, Math.min(4, initialZoom * factor));
            if (zoomLevel <= 1) {
                panX = 0;
                panY = 0;
            } else {
                upgradeImageFidelity();
            }
            resetZoom();
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!lightbox.classList.contains('open')) return;
        handleEnd();
        
        // Restore transition style after pinch gesture completes
        if (initialDistance > 0) {
            lightboxImg.style.transition = 'transform 0.2s ease';
        }
        initialDistance = 0;

        // Horizontal and vertical swipes when zoom is 1
        if (zoomLevel === 1 && touchStartX !== 0 && touchStartY !== 0 && e.changedTouches.length > 0) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > swipeThreshold) {
                    if (dx < 0) {
                        navigateLightbox('next');
                    } else {
                        navigateLightbox('prev');
                    }
                }
            } else {
                if (Math.abs(dy) > swipeThreshold * 1.5) {
                    if (dy > 0) {
                        // Swipe down to close
                        closeLightbox();
                    }
                }
            }
            touchStartX = 0;
            touchStartY = 0;
        }
    });

    // Disable native ghost drag outline on lightbox image
    lightboxImg.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    // Mouse event listeners for desktop panning
    lightboxImgWrapper.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            handleMove(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        handleEnd();
    });

    // Mouse scroll wheel zoom
    lightboxImgWrapper.addEventListener('wheel', (e) => {
        if (lightboxVideo.style.display === 'block' || lightboxAudio.style.display === 'block') {
            return; // Only zoom images
        }
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.2 : 0.8;
        const newZoom = Math.max(0.5, Math.min(4, zoomLevel * factor));
        if (newZoom !== zoomLevel) {
            lightboxImg.style.transition = 'transform 0.1s ease';
            zoomLevel = newZoom;
            if (zoomLevel <= 1) {
                panX = 0;
                panY = 0;
            } else {
                upgradeImageFidelity();
            }
            resetZoom();
        }
    }, { passive: false });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
        
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');
        
        if (document.body.classList.contains('light-theme')) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    });

    // Keyboard Shortcuts (Arrow keys navigation for Lightbox)
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('open')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') navigateLightbox('next');
            if (e.key === 'ArrowLeft') navigateLightbox('prev');
            if (e.key === '+' || e.key === '=') {
                lightboxImg.style.transition = 'transform 0.2s ease';
                if (zoomLevel < 4) { 
                    zoomLevel += 0.5; 
                    resetZoom(); 
                    if (zoomLevel > 1) upgradeImageFidelity();
                }
            }
            if (e.key === '-') {
                lightboxImg.style.transition = 'transform 0.2s ease';
                if (zoomLevel > 0.5) {
                    zoomLevel -= 0.5;
                    if (zoomLevel <= 1) { panX = 0; panY = 0; }
                    resetZoom();
                }
            }
        }
    });

    // Listen to history popstate (browser back/forward button clicks)
    window.addEventListener('popstate', (e) => {
        const path = window.location.pathname.substring(1);
        activeTab = 'my-drive';
        updateNavActiveState();
        loadDirectory(decodeURIComponent(path));
    });

    // --- Init ---
    // Load directory from URL path
    const initialPath = window.location.pathname.substring(1);
    loadDirectory(decodeURIComponent(initialPath));
});
