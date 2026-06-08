window.initVeoApp = () => {
    // UI Elements
    const dropZone = document.getElementById('dropZone');
    const videoInput = document.getElementById('videoInput');
    const queueList = document.getElementById('queueList');
    const videoItems = document.getElementById('videoItems');
    const queueCount = document.getElementById('queueCount');
    const workspace = document.getElementById('workspace');
    
    const manualInstruction = document.getElementById('manualInstruction');
    const selectionBox = document.getElementById('selectionBox');
    const resizeHandle = document.getElementById('resizeHandle');
    const applyAllBtn = document.getElementById('applyAllBtn');
    
    const previewVideo = document.getElementById('previewVideo');
    const resultVideo = document.getElementById('resultVideo');
    const videoContainer = document.getElementById('videoContainer');
    
    const testCurrentBtn = document.getElementById('testCurrentBtn');
    const processAllBtn = document.getElementById('processAllBtn');
    // Fix WebM seamless looping by building duration index
    function playWebmSeamlessly(vid, blobUrl) {
        vid.src = blobUrl;
        vid.loop = false;
        
        if (vid.timeUpdateHandler) {
            vid.removeEventListener('timeupdate', vid.timeUpdateHandler);
        }
        
        vid.timeUpdateHandler = function() {
            // Thêm một chút bù đắp để tránh nháy đen ở giây cuối của webm
            if (this.duration && this.currentTime >= this.duration - 0.05) {
                this.currentTime = 0;
                this.play().catch(e => {});
            }
        };
        vid.addEventListener('timeupdate', vid.timeUpdateHandler);
        vid.play().catch(e => {});
    }
    
    previewVideo.loop = false;
    previewVideo.timeUpdateHandler = function() {
        if (this.duration && this.currentTime >= this.duration - 0.25) {
            this.currentTime = 0.25;
            this.play().catch(e => {});
        }
    };
    previewVideo.addEventListener('timeupdate', previewVideo.timeUpdateHandler);

    previewVideo.addEventListener('ended', () => {
        previewVideo.currentTime = 0.25;
        previewVideo.play().catch(e => {});
    });
    
    // History Modal
    const historyModal = document.getElementById('historyModal');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const galleryList = document.getElementById('galleryList');
    const historyDownloadAllBtn = document.getElementById('historyDownloadAllBtn');
    
    // Workspace Gallery
    const workspaceGalleryArea = document.getElementById('workspaceGalleryArea');
    const workspaceGalleryList = document.getElementById('workspaceGalleryList');
    const workspaceDownloadAllBtn = document.getElementById('workspaceDownloadAllBtn');
    
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const statusBox = document.getElementById('statusBox');

    const canvas = document.getElementById('processingCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // State Management
    let filesQueue = []; 
    let processedResults = []; // ALL history
    let currentBatchResults = []; // Current batch
    let currentActiveIndex = -1;

    // Per-video box storage: mapping File -> { nx, ny, nw, nh }
    const videoBoxes = new Map();
    const savedBoxConfig = localStorage.getItem('veo3_default_box');
    const DEFAULT_BOX = savedBoxConfig ? JSON.parse(savedBoxConfig) : { nx: 0.81, ny: 0.92, nw: 0.14, nh: 0.06 };

    // Set initial normalizedBox to DEFAULT_BOX
    let normalizedBox = { ...DEFAULT_BOX };
    let globalBox = { x: 0, y: 0, w: 60, h: 40 };

    let isDragging = false;
    let isResizing = false;
    let startX, startY;

    // --- File Upload & Queue Handling ---
    dropZone.addEventListener('click', () => videoInput.click());

    videoInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            addFilesToQueue(Array.from(e.target.files));
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    
    dropZone.addEventListener('drop', (e) => {
        if(e.dataTransfer.files.length > 0) {
            addFilesToQueue(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/')));
        }
    });

    function addFilesToQueue(newFiles) {
        filesQueue = filesQueue.concat(newFiles);
        renderQueue();
        if (filesQueue.length > 0 && currentActiveIndex === -1) {
            selectVideo(0);
        }
        workspace.style.display = 'block';
    }

    function renderQueue() {
        queueCount.textContent = filesQueue.length;
        queueList.style.display = 'block';
        
        if (videoItems.children.length !== filesQueue.length) {
            videoItems.innerHTML = '';
            filesQueue.forEach((file, index) => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                
                const textSpan = document.createElement('span');
                textSpan.textContent = `${index + 1}. ${file.name}`;
                textSpan.style.cursor = 'pointer';
                textSpan.onclick = () => selectVideo(index);
                textSpan.style.flexGrow = '1';
                
                const deleteBtn = document.createElement('span');
                deleteBtn.innerHTML = '&#128465;'; // Trash can
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.padding = '0 5px';
                deleteBtn.style.color = '#ef4444';
                deleteBtn.title = 'Xóa video này';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    filesQueue.splice(index, 1);
                    if (currentActiveIndex === index) {
                        currentActiveIndex = Math.min(currentActiveIndex, filesQueue.length - 1);
                        if (currentActiveIndex >= 0) selectVideo(currentActiveIndex);
                        else {
                            workspace.style.display = 'none';
                            currentActiveIndex = -1;
                        }
                    } else if (currentActiveIndex > index) {
                        currentActiveIndex--;
                    }
                    // Force re-render
                    videoItems.innerHTML = '';
                    renderQueue();
                    if (filesQueue.length === 0) queueList.style.display = 'none';
                };
                
                li.appendChild(textSpan);
                li.appendChild(deleteBtn);
                videoItems.appendChild(li);
            });
        }
        
        Array.from(videoItems.children).forEach((li, index) => {
            const file = filesQueue[index];
            
            if (index === currentActiveIndex) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
            
            let badge = li.querySelector('.status-badge');
            if (!badge) {
                badge = document.createElement('span');
                li.appendChild(badge);
            }
            
            if (processedResults.find(r => r.file === file)) {
                badge.className = 'status-badge done';
                badge.textContent = 'Đã xử lý';
            } else {
                badge.className = 'status-badge';
                badge.textContent = 'Chờ';
            }
        });
    }

    applyAllBtn.addEventListener('click', () => {
        applyAllBtn.innerHTML = "✅ Đã Khóa Vị Trí Cho Tất Cả";
        applyAllBtn.style.background = "#10b981";
    });

    function selectVideo(index) {
        if (index < 0 || index >= filesQueue.length) return;
        if (currentActiveIndex === index) return;
        
        const oldActive = queueList.querySelector('.active');
        if (oldActive) oldActive.classList.remove('active');
        const items = queueList.querySelectorAll('li');
        if (items[index]) items[index].classList.add('active');

        currentActiveIndex = index;
        const file = filesQueue[index];
        const fileURL = URL.createObjectURL(file);
        
        previewVideo.src = fileURL;
        previewVideo.load();
        
        previewVideo.onloadedmetadata = () => {
            previewVideo.currentTime = 0.25;
            previewVideo.play().catch(e => console.log('Autoplay blocked:', e));
            // Explicitly show selection box and apply all button
            selectionBox.style.display = 'block';
            applyAllBtn.style.display = 'block';
            
            // Ensure layout is updated before getting rect
            requestAnimationFrame(() => {
                applyNormalizedBox();
                updateBoxUI();
            });
        };
        
        const res = processedResults.find(r => r.file === file);
        if (res) {
            playWebmSeamlessly(resultVideo, res.blobUrl);
            resultVideo.play();
        } else {
            resultVideo.src = '';
        }
        
        statusBox.innerHTML = '';
        progressContainer.style.display = 'none';
        
        const savedBox = videoBoxes.get(file);
        if (savedBox) {
            normalizedBox = { ...savedBox };
        } else {
            normalizedBox = { ...DEFAULT_BOX };
            videoBoxes.set(file, { ...normalizedBox });
        }
    }

    applyAllBtn.addEventListener('click', () => {
        if (!normalizedBox || filesQueue.length === 0) return;
        localStorage.setItem('veo3_default_box', JSON.stringify(normalizedBox));
        filesQueue.forEach(file => {
            videoBoxes.set(file, { ...normalizedBox });
        });
        statusBox.style.color = '#34d399';
        statusBox.innerHTML = `✅ Đã áp dụng vị trí khung này cho TẤT CẢ ${filesQueue.length} video!`;
    });

    function updateBoxUI() {
        selectionBox.style.left = globalBox.x + 'px';
        selectionBox.style.top = globalBox.y + 'px';
        selectionBox.style.width = globalBox.w + 'px';
        selectionBox.style.height = globalBox.h + 'px';
    }

    function calculateNormalizedBox() {
        const vr = getVideoVisualRect(previewVideo, videoContainer);
        normalizedBox = {
            nx: (globalBox.x - vr.x) / vr.w,
            ny: (globalBox.y - vr.y) / vr.h,
            nw: globalBox.w / vr.w,
            nh: globalBox.h / vr.h
        };
        if (currentActiveIndex >= 0 && currentActiveIndex < filesQueue.length) {
            videoBoxes.set(filesQueue[currentActiveIndex], { ...normalizedBox });
        }
    }

    function applyNormalizedBox() {
        if (!normalizedBox) return;
        const vr = getVideoVisualRect(previewVideo, videoContainer);
        globalBox.x = Math.max(0, vr.x + normalizedBox.nx * vr.w);
        globalBox.y = Math.max(0, vr.y + normalizedBox.ny * vr.h);
        globalBox.w = Math.max(20, normalizedBox.nw * vr.w);
        globalBox.h = Math.max(20, normalizedBox.nh * vr.h);
    }

    selectionBox.addEventListener('mousedown', (e) => {
        if (e.target === resizeHandle) isResizing = true;
        else isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging && !isResizing) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;

        const containerRect = videoContainer.getBoundingClientRect();

        if (isDragging) {
            globalBox.x += dx;
            globalBox.y += dy;
        } else if (isResizing) {
            globalBox.w += dx;
            globalBox.h += dy;
        }

        globalBox.w = Math.max(20, Math.min(globalBox.w, containerRect.width - globalBox.x));
        globalBox.h = Math.max(20, Math.min(globalBox.h, containerRect.height - globalBox.y));
        globalBox.x = Math.max(0, Math.min(globalBox.x, containerRect.width - globalBox.w));
        globalBox.y = Math.max(0, Math.min(globalBox.y, containerRect.height - globalBox.h));

        updateBoxUI();
        calculateNormalizedBox();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
    });

    applyAllBtn.addEventListener('click', () => {
        calculateNormalizedBox();
        localStorage.setItem('veo3_default_box', JSON.stringify(normalizedBox));
        alert('Đã lưu vị trí này! Hệ thống sẽ dùng vị trí này cho toàn bộ video trong mớ của bạn.');
    });

    function getVideoVisualRect(vidEl, containerEl) {
        const vidRect = vidEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        return {
            x: vidRect.left - containerRect.left,
            y: vidRect.top - containerRect.top,
            w: vidRect.width,
            h: vidRect.height
        };
    }

    function applyDelogo(imageData, rectX, rectY, rectW, rectH) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const startX = Math.max(1, rectX);
        const startY = Math.max(1, rectY);
        const endX = Math.min(width - 2, rectX + rectW);
        const endY = Math.min(height - 2, rectY + rectH);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const dTop = y - startY + 1;
                const dBot = endY - y;
                const dLeft = x - startX + 1;
                const dRight = endX - x;
                
                const wTop = 1.0 / (dTop * dTop);
                const wBot = 1.0 / (dBot * dBot);
                const wLeft = 1.0 / (dLeft * dLeft);
                const wRight = 1.0 / (dRight * dRight);
                const wTotal = wTop + wBot + wLeft + wRight;
                
                const idxTop = ((startY - 1) * width + x) * 4;
                const idxBot = (endY * width + x) * 4;
                const idxLeft = (y * width + (startX - 1)) * 4;
                const idxRight = (y * width + endX) * 4;
                const idx = (y * width + x) * 4;
                
                for (let c = 0; c < 3; c++) {
                    data[idx + c] = (
                        data[idxTop + c] * wTop +
                        data[idxBot + c] * wBot +
                        data[idxLeft + c] * wLeft +
                        data[idxRight + c] * wRight
                    ) / wTotal;
                }
            }
        }
    }

    // --- Core Processing Logic ---
    async function processVideo(file, fileIndex, totalFiles, isTest = false) {
        return new Promise(async (resolve, reject) => {
            try {
                // FIXED BUG: Create a NEW hidden video element for EACH processing task
                // to avoid "AudioContext already connected" DOMException crashes on subsequent videos.
                const localVideo = document.createElement('video');
                window.currentProcessingVideo = localVideo;
                localVideo.muted = true;
                localVideo.playsInline = true;
                localVideo.style.position = 'fixed';
                localVideo.style.left = '-9999px';
                document.body.appendChild(localVideo);
                
                const fileURL = URL.createObjectURL(file);
                localVideo.src = fileURL;
                
                await new Promise((res) => {
                    if (localVideo.readyState >= 1) res();
                    else localVideo.addEventListener('loadedmetadata', res, { once: true });
                });

                canvas.width = localVideo.videoWidth;
                canvas.height = localVideo.videoHeight;

                let realX, realY, realW, realH;
                const fileBox = videoBoxes.get(file) || DEFAULT_BOX;
                const padding = 2;
                const rawX = Math.floor(fileBox.nx * canvas.width) - padding;
                const rawY = Math.floor(fileBox.ny * canvas.height) - padding;
                const rawW = Math.floor(fileBox.nw * canvas.width) + padding * 2;
                const rawH = Math.floor(fileBox.nh * canvas.height) + padding * 2;
                realX = Math.max(0, rawX);
                realY = Math.max(0, rawY);
                realW = Math.min(canvas.width - realX, rawW);
                realH = Math.min(canvas.height - realY, rawH);

                // Ensure video is playing to properly capture tracks
                await new Promise((res) => {
                    if (!localVideo.paused && localVideo.readyState >= 2) res();
                    else localVideo.addEventListener('playing', res, { once: true });
                    
                    localVideo.play().catch((e) => {
                        console.error('Play failed during processing!', e);
                    });
                });
                
                // Capture video track from canvas
                const fps = 30;
                const canvasStream = canvas.captureStream(fps);
                const combinedTracks = [...canvasStream.getVideoTracks()];
                
                // Directly capture audio track from the playing video
                const localStream = localVideo.captureStream ? localVideo.captureStream() : localVideo.mozCaptureStream ? localVideo.mozCaptureStream() : null;
                if (localStream && localStream.getAudioTracks().length > 0) {
                    combinedTracks.push(...localStream.getAudioTracks());
                }
                const combinedStream = new MediaStream(combinedTracks);

                const options = { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8000000 };
                let recorder;
                try {
                    recorder = new MediaRecorder(combinedStream, options);
                } catch (e) {
                    recorder = new MediaRecorder(combinedStream);
                }
                window.currentRecorder = recorder;

                const chunks = [];
                recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

                recorder.onstop = async () => {
                    const rawBlob = new Blob(chunks, { type: 'video/webm' });
                    // Fix Chrome's 20s IPC transfer delay by flattening the blob
                    const buffer = await rawBlob.arrayBuffer();
                    const blob = new Blob([buffer], { type: 'video/webm' });
                    const downloadUrl = URL.createObjectURL(blob);
                    
                    if (!isTest) {
                        saveVideoToHistoryDB(file.name, blob, localVideo.duration);
                        processedResults.push({ file: file, blobUrl: downloadUrl });
                        currentBatchResults.push({ file: file, blobUrl: downloadUrl });
                        
                        // Add to both galleries
                        addVideoToGallery(downloadUrl, file, galleryList, localVideo.duration);
                        addVideoToGallery(downloadUrl, file, workspaceGalleryList, localVideo.duration);
                    }
                    
                    URL.revokeObjectURL(fileURL);
                    document.body.removeChild(localVideo);
                    resolve(downloadUrl);
                };
                let recorderStarted = false;
                let recorderStopped = false;

                const processFrame = () => {
                    const skipStart = 0.25;
                    const skipEnd = 0.3;
                    const duration = localVideo.duration || 0;

                    if (localVideo.ended) {
                        if (recorderStarted && recorder.state !== 'inactive') recorder.stop();
                        return;
                    }

                    if (localVideo.readyState >= 2) {
                        ctx.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
                        if (realW > 0 && realH > 0) {
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            applyDelogo(imgData, realX, realY, realW, realH);
                            ctx.putImageData(imgData, 0, 0);
                        }
                        
                        if (duration > 0.6) {
                            if (!recorderStarted && localVideo.currentTime >= skipStart) {
                                recorder.start();
                                recorderStarted = true;
                            }
                            if (recorderStarted && !recorderStopped && localVideo.currentTime >= duration - skipEnd) {
                                recorder.stop();
                                recorderStopped = true;
                            }
                        } else {
                            if (!recorderStarted) {
                                recorder.start();
                                recorderStarted = true;
                            }
                        }

                        const percent = (localVideo.currentTime / localVideo.duration) * 100;
                        progressBar.style.width = percent + '%';
                        statusBox.innerHTML = `⏳ Đang xử lý Video ${fileIndex}/${totalFiles}: ${file.name} ... ${Math.round(percent)}%`;
                    }
                    
                    if (!recorderStopped) {
                        requestAnimationFrame(processFrame);
                    } else if (!localVideo.ended) {
                        localVideo.currentTime = localVideo.duration;
                    }
                };

                processFrame();

            } catch (error) {
                reject(error);
            }
        });
    }

    let isGlobalMuted = true;
    const globalMuteBtn = document.getElementById('globalMuteBtn');
    const wsMuteBtn = document.getElementById('wsMuteBtn');
    
    function toggleMute() {
        isGlobalMuted = !isGlobalMuted;
        const text = isGlobalMuted ? '🔇 Bật âm' : '🔊 Tắt âm';
        if (globalMuteBtn) globalMuteBtn.innerHTML = text;
        if (wsMuteBtn) wsMuteBtn.innerHTML = text;
        const vids = document.querySelectorAll('.gallery-video');
        vids.forEach(v => v.muted = isGlobalMuted);
    }
    
    if (globalMuteBtn) globalMuteBtn.addEventListener('click', toggleMute);
    if (wsMuteBtn) wsMuteBtn.addEventListener('click', toggleMute);

    let isGlobalPaused = false;
    const globalPauseBtn = document.getElementById('globalPauseBtn');
    const wsPauseBtn = document.getElementById('wsPauseBtn');
    
    function togglePause() {
        isGlobalPaused = !isGlobalPaused;
        const text = isGlobalPaused ? '▶️ Phát' : '⏸ Dừng';
        if (globalPauseBtn) globalPauseBtn.innerHTML = text;
        if (wsPauseBtn) wsPauseBtn.innerHTML = text;
        const vids = document.querySelectorAll('.gallery-video');
        vids.forEach(v => {
            if (isGlobalPaused) v.pause();
            else v.play();
        });
    }

    if (globalPauseBtn) globalPauseBtn.addEventListener('click', togglePause);
    if (wsPauseBtn) wsPauseBtn.addEventListener('click', togglePause);
    
    // --- Selection and Deletion Logic ---
    function attachSelectionLogic(selectAllBtnId, deleteBtnId, listId) {
        const selectAllBtn = document.getElementById(selectAllBtnId);
        const deleteBtn = document.getElementById(deleteBtnId);
        const list = document.getElementById(listId);
        
        if (!selectAllBtn || !deleteBtn || !list) return;
        
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = list.querySelectorAll('.video-checkbox');
            if (checkboxes.length === 0) return;
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            updateDeleteBtn();
        });
        
        deleteBtn.addEventListener('click', () => {
            const checkboxes = list.querySelectorAll('.video-checkbox:checked');
            checkboxes.forEach(cb => {
                const item = cb.closest('.gallery-item');
                if (item) item.remove();
            });
            updateDeleteBtn();
        });
        
        function updateDeleteBtn() {
            const checkboxes = list.querySelectorAll('.video-checkbox');
            const checkedCount = list.querySelectorAll('.video-checkbox:checked').length;
            deleteBtn.style.display = checkedCount > 0 ? 'block' : 'none';
            if (checkboxes.length > 0 && checkedCount === checkboxes.length) {
                selectAllBtn.innerHTML = '<span class="custom-cb-icon checked"></span> Bỏ chọn tất cả';
            } else if (checkedCount > 0) {
                selectAllBtn.innerHTML = '<span class="custom-cb-icon partial"></span> Chọn tất cả';
            } else {
                selectAllBtn.innerHTML = '<span class="custom-cb-icon unchecked"></span> Chọn tất cả';
            }
        }
        
        list.addEventListener('change', (e) => {
            if (e.target.classList.contains('video-checkbox')) {
                updateDeleteBtn();
            }
        });
    }
    
    attachSelectionLogic('historySelectAllBtn', 'historyDeleteBtn', 'galleryList');
    attachSelectionLogic('wsSelectAllBtn', 'wsDeleteBtn', 'workspaceGalleryList');

    // --- Modal Logic ---
    
    if (historyToggleBtn) {
        historyToggleBtn.addEventListener('click', () => {
            historyModal.style.display = 'block';
        });
    }
    
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historyModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target == historyModal) {
            historyModal.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && historyModal.style.display === 'block') {
            historyModal.style.display = 'none';
        }
    });

    function addVideoToGallery(blobUrl, file, targetList, duration) {
        if (targetList === workspaceGalleryList) {
            workspaceGalleryArea.style.display = 'block';
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-item';

        const vid = document.createElement('video');
        vid.className = 'gallery-video';
        playWebmSeamlessly(vid, blobUrl);
        vid.autoplay = !isGlobalPaused;
        vid.muted = isGlobalMuted;
        vid.controls = true;
        

        const dlBtn = document.createElement('button');
        dlBtn.type = 'button';
        dlBtn.className = 'btn-secondary';
        dlBtn.innerHTML = '⬇️ Tải file này';
        dlBtn.style.marginTop = '8px';
        dlBtn.style.background = '#3b82f6';
        dlBtn.onclick = async (e) => {
            e.preventDefault();
            const safeName = "Veo3_Clean_" + file.name.replace(/\.[^/.]+$/, "") + ".mp4";
            
            let handle = null;
            if ('showSaveFilePicker' in window) {
                try {
                    handle = await window.showSaveFilePicker({
                        suggestedName: safeName,
                        types: [{ description: 'Video File', accept: {'video/mp4': ['.mp4']} }]
                    });
                } catch(err) {
                    if (err.name !== 'AbortError') console.error(err);
                    return; // Người dùng hủy hộp thoại lưu
                }
            }

            const originalHtml = dlBtn.innerHTML;
            dlBtn.innerHTML = '<span class="spinner"></span> Đang ghi file...';
            dlBtn.disabled = true;

            const finishDownloadUi = () => {
                dlBtn.innerHTML = '✅ Đã lưu xong';
                setTimeout(() => {
                    dlBtn.innerHTML = originalHtml;
                    dlBtn.disabled = false;
                }, 2000);
            };

            if (handle) {
                try {
                    const writable = await handle.createWritable();
                    const blob = await fetch(blobUrl).then(r => r.blob());
                    await writable.write(blob);
                    await writable.close();
                    finishDownloadUi();
                } catch(err) {
                    console.error("Lỗi ghi file:", err);
                    dlBtn.innerHTML = '❌ Lỗi lưu file';
                    setTimeout(() => {
                        dlBtn.innerHTML = originalHtml;
                        dlBtn.disabled = false;
                    }, 2000);
                }
            } else {
                // Fallback
                const a = document.createElement('a');
                a.href = blobUrl; a.download = safeName; a.click();
                finishDownloadUi();
            }
        };
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'video-checkbox';
        
        wrapper.appendChild(cb);
        wrapper.appendChild(vid);
        wrapper.appendChild(dlBtn);
        targetList.appendChild(wrapper);
    }

    const resetQueueBtn = document.getElementById('resetQueueBtn');
    if (resetQueueBtn) {
        resetQueueBtn.addEventListener('click', () => {
            filesQueue = [];
            currentBatchResults = [];
            currentActiveIndex = -1;
            
            queueList.style.display = 'none';
            videoItems.innerHTML = '';
            queueCount.innerText = '0';
            workspaceGalleryList.innerHTML = '';
            workspaceGalleryArea.style.display = 'none';
            workspace.style.display = 'none';
            statusBox.innerHTML = '';
            progressContainer.style.visibility = 'hidden';
            videoInput.value = '';
            
            previewVideo.removeAttribute('src');
            previewVideo.load();
            resultVideo.removeAttribute('src');
            resultVideo.load();
            
            setUILoading(false);
        });
    }

    testCurrentBtn.addEventListener('click', async () => {
        if (currentActiveIndex === -1) return;
        setUILoading(true);
        try {
            const file = filesQueue[currentActiveIndex];
            const url = await processVideo(file, 1, 1, false);
            file.status = 'done';
            playWebmSeamlessly(resultVideo, url);
            resultVideo.play();
            renderQueue();
            statusBox.style.color = '#34d399';
            statusBox.innerHTML = `✅ Xóa logo thành công!`;
        } catch (e) {
            statusBox.style.color = '#ef4444';
            statusBox.innerHTML = `❌ Lỗi: ${e.message}`;
        }
        setUILoading(false);
        checkAllFinished();
    });

    let isProcessingPaused = false;
    let isProcessingActive = false;

    processAllBtn.addEventListener('click', async () => {
        if (filesQueue.length === 0) return;
        
        if (isProcessingActive) {
            isProcessingPaused = !isProcessingPaused;
            if (isProcessingPaused) {
                processAllBtn.innerHTML = '▶ TIẾP TỤC XÓA LOGO ▶';
                processAllBtn.style.background = 'linear-gradient(to right, #f59e0b, #d97706)';
                if (window.currentProcessingVideo) window.currentProcessingVideo.pause();
                if (window.currentRecorder && window.currentRecorder.state === 'recording') window.currentRecorder.pause();
                statusBox.innerHTML = '⏸ Tạm dừng xử lý. Ấn Tiếp tục để chạy tiếp...';
            } else {
                processAllBtn.innerHTML = '⏸ TẠM DỪNG XÓA LOGO ⏸';
                processAllBtn.style.background = 'linear-gradient(to right, #ef4444, #b91c1c)';
                if (window.currentProcessingVideo) window.currentProcessingVideo.play().catch(()=>{});
                if (window.currentRecorder && window.currentRecorder.state === 'paused') window.currentRecorder.resume();
                statusBox.innerHTML = '▶ Đang tiếp tục xử lý...';
            }
            return;
        }

        isProcessingActive = true;
        isProcessingPaused = false;
        setUILoading(true);
        processAllBtn.innerHTML = '⏸ TẠM DỪNG XÓA LOGO ⏸';
        processAllBtn.style.background = 'linear-gradient(to right, #ef4444, #b91c1c)';
        
        let successCount = 0;
        for (let i = 0; i < filesQueue.length; i++) {
            while (isProcessingPaused) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            const file = filesQueue[i];
            // Remove check to allow re-processing if user changes settings
            try {
                selectVideo(i); 
                await processVideo(file, i + 1, filesQueue.length);
                successCount++;
                renderQueue(); 
            } catch (e) {
                console.error("Error processing", file.name, e);
            }
        }
        
        isProcessingActive = false;
        processAllBtn.innerHTML = '🚀 BẮT ĐẦU XÓA LOGO TOÀN BỘ VIDEO 🚀';
        processAllBtn.style.background = '';
        setUILoading(false);
        statusBox.style.color = '#34d399';
        statusBox.innerHTML = `✅ Xóa logo thành công!`;
        checkAllFinished();
    });

    function setUILoading(isLoading) {
        testCurrentBtn.disabled = isLoading;
        if (!isProcessingActive) processAllBtn.disabled = isLoading;
        if (isLoading) {
            progressContainer.style.visibility = 'visible';
            statusBox.style.color = '#a5b4fc';
        } else {
            progressContainer.style.visibility = 'hidden';
        }
    }

    function checkAllFinished() {
    }

    const triggerBatchDownload = async (btnElem, resultsArray) => {
        if (resultsArray.length === 0) {
            alert("Không có video nào để tải!");
            return;
        }
        
        let handle = null;
        if ('showSaveFilePicker' in window) {
            try {
                handle = await window.showSaveFilePicker({
                    suggestedName: "Veo3_Clean_All.zip",
                    types: [{ description: 'ZIP Archive', accept: {'application/zip': ['.zip']} }]
                });
            } catch(e) {
                if (e.name !== 'AbortError') console.error(e);
                return; // User cancelled the save dialog
            }
        }
        
        const originalText = btnElem.innerHTML;
        btnElem.disabled = true;
        btnElem.innerHTML = '<span class="spinner"></span> Đang đóng gói ZIP...';
        
        try {
            const zip = new JSZip();
            for(let i = 0; i < resultsArray.length; i++) {
                const res = resultsArray[i];
                const safeName = "Veo3_Clean_" + res.file.name.replace(/\.[^/.]+$/, "") + ".mp4";
                const blob = await fetch(res.blobUrl).then(r => r.blob());
                zip.file(safeName, blob);
            }
            
            const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
            
            if (handle) {
                const writable = await handle.createWritable();
                await writable.write(zipBlob);
                await writable.close();
            } else {
                // Fallback
                const zipUrl = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = zipUrl;
                a.download = "Veo3_Clean_All.zip";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            
            btnElem.innerHTML = '✅ Đã lưu file ZIP';
            btnElem.style.background = '#10b981';
            setTimeout(() => {
                btnElem.disabled = false;
                btnElem.innerHTML = originalText;
                btnElem.style.background = '';
            }, 2000);
        } catch(e) {
            console.error(e);
            btnElem.innerHTML = '❌ Lỗi tải xuống';
            btnElem.style.background = '#ef4444';
            setTimeout(() => {
                btnElem.disabled = false;
                btnElem.innerHTML = originalText;
                btnElem.style.background = '';
            }, 2000);
        }
    };

    if (historyDownloadAllBtn) {
        historyDownloadAllBtn.addEventListener('click', () => triggerBatchDownload(historyDownloadAllBtn, processedResults));
    }
    if (workspaceDownloadAllBtn) {
        workspaceDownloadAllBtn.addEventListener('click', () => triggerBatchDownload(workspaceDownloadAllBtn, currentBatchResults));
    }

// ====== INDEXEDDB HISTORY ======
const DB_NAME = "Veo3HistoryDB";
const STORE_NAME = "videos";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveVideoToHistoryDB(fileName, blob, duration) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.add({ fileName, blob, duration, timestamp: Date.now() });
    } catch(e) { console.error("DB Save Error:", e); }
}

async function loadHistoryFromDB() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const records = request.result;
            records.sort((a,b) => a.timestamp - b.timestamp);
            records.forEach(record => {
                const blobUrl = URL.createObjectURL(record.blob);
                const mockFile = { name: record.fileName };
                processedResults.push({ file: mockFile, blobUrl: blobUrl, id: record.id });
                addVideoToGallery(blobUrl, mockFile, galleryList, record.duration, record.id);
            });
        };
    } catch(e) { console.error("DB Load Error:", e); }
}

async function clearHistoryDB() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        galleryList.innerHTML = "";
        processedResults = [];
        alert("Đã xóa toàn bộ lịch sử!");
    } catch(e) { console.error("DB Clear Error:", e); }
}

loadHistoryFromDB();
const historyClearAllBtn = document.getElementById("historyClearAllBtn");
if (historyClearAllBtn) {
    historyClearAllBtn.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử video đã xử lý không?")) {
            clearHistoryDB();
        }
    });
}
// ===============================
};
