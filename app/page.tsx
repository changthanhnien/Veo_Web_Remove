"use client";

import { useEffect, useRef } from 'react';

export default function Home() {
  const isInit = useRef(false);

  useEffect(() => {
    if (isInit.current) return;
    isInit.current = true;

    // Tải JSZip
    const script1 = document.createElement('script');
    script1.src = '/jszip.min.js';
    script1.async = false;
    document.body.appendChild(script1);

    // Tải script chính của Veo
    const script2 = document.createElement('script');
    script2.src = '/script.js';
    script2.async = false;
    script2.onload = () => {
        if (typeof window !== 'undefined' && (window as any).initVeoApp) {
            (window as any).initVeoApp();
        }
    };
    document.body.appendChild(script2);
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: `
      <div class="container" style="position: relative;">
          <button type="button" class="btn-secondary" id="historyToggleBtn" style="position: absolute; top: 30px; right: 30px; width: auto; background: #8b5cf6; padding: 8px 15px; z-index: 10;">📜 Lịch sử</button>
          <h1>Xóa Logo Veo3 Hàng Loạt</h1>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <p class="subtitle" style="margin: 0;">Tải lên nhiều video cùng lúc, chọn vị trí xóa 1 lần và áp dụng cho tất cả.</p>
              <button type="button" class="btn-secondary" id="resetQueueBtn" style="width: auto; background: #ef4444; padding: 6px 12px;">🗑 Xóa làm lại</button>
          </div>

          <div class="upload-area" id="dropZone">
              <div class="upload-icon">📂</div>
              <h3 style="margin-bottom: 5px;">Kéo thả hoặc Bấm chọn Nhiều Video Cùng Lúc</h3>
          </div>
          <input type="file" id="videoInput" accept="video/*" multiple style="display:none;" />

          <div id="historyModal" class="modal">
              <div class="modal-content">
                  <span class="close-btn" id="closeHistoryBtn">&times;</span>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; padding-right: 40px;">
                      <h2 style="margin: 0;">Lịch sử Video đã xử lý</h2>
                      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                          <button type="button" class="btn-secondary" id="historySelectAllBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem;">
                              <span class="custom-cb-icon unchecked"></span> Chọn tất cả
                          </button>
                          <button type="button" class="btn-secondary" id="historyDeleteBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem; background: #ef4444; display: none;">
                              🗑 Xóa
                          </button>
                          <button type="button" class="btn-secondary" id="globalMuteBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem;">
                              🔇 Tắt âm
                          </button>
                          <button type="button" class="btn-secondary" id="globalPauseBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem; background: #f59e0b;">
                              ⏸ Dừng
                          </button>
                          <button type="button" class="btn-secondary" id="historyDownloadAllBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem; background: #10b981; display: flex; align-items: center; gap: 6px;">
                              📥 Tải tất cả
                          </button>
                          <button type="button" class="btn-secondary" id="historyClearAllBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem; background: #ef4444; display: flex; align-items: center; gap: 6px;">
                              🗑 Xóa Lịch Sử
                          </button>
                      </div>
                  </div>
                  <div id="galleryList" class="gallery-list">
                  </div>
              </div>
          </div>

          <div class="queue-list" id="queueList" style="display: none;">
              <h3>Danh sách Video Đang Chờ (<span id="queueCount">0</span>)</h3>
              <ul id="videoItems"></ul>
          </div>

          <div class="workspace" id="workspace" style="display: none;">
              <div class="preview-layout">
                  <div class="video-box" id="boxBefore">
                      <h3>1. Chỉnh vùng cần xóa (Before)</h3>
                      <p class="instruction" id="manualInstruction">Kéo và thay đổi kích thước khung đỏ sao cho ôm khít vùng cần xóa.</p>
                      <div class="video-container" id="videoContainer">
                          <video id="previewVideo" playsinline autoplay muted controls></video>
                          <div id="selectionBox">
                              <div class="resize-handle" id="resizeHandle"></div>
                          </div>
                      </div>
                      <p class="instruction" style="font-size: 0.8rem; margin-top: 5px; color: #94a3b8;">*Có thể ấn vào video để Play/Pause</p>
                      <button type="button" class="btn-secondary" id="applyAllBtn" style="width: 100%; margin-top: 10px; background: #6366f1; font-weight: 600;">
                          🎯 Áp Dụng Vị Trí Này Cho Tất Cả Video
                      </button>
                  </div>

                  <div class="video-box" id="boxAfter">
                      <h3>2. Xem trước kết quả (After)</h3>
                      <div class="video-container">
                          <video id="resultVideo" playsinline autoplay muted controls></video>
                      </div>
                      <button type="button" class="btn-process" id="testCurrentBtn" style="margin-top: 10px; width: 100%; font-size: 1rem; padding: 10px;">
                          🧪 Thử Xóa Video Này
                      </button>
                  </div>
              </div>

              <div class="global-actions">
                  <button type="button" class="btn-process" id="processAllBtn" style="background: linear-gradient(45deg, #10b981, #3b82f6);">
                      🚀 BẮT ĐẦU XÓA LOGO TOÀN BỘ VIDEO 🚀
                  </button>
                  
                  <div style="min-height: 60px;">
                      <div class="progress-container" id="progressContainer" style="visibility: hidden; margin-top: 20px;">
                          <div class="progress-bar" id="progressBar"></div>
                      </div>
                      <div id="statusBox" style="margin-top: 15px; font-weight: 600; text-align: center; min-height: 24px; color: #a5b4fc; font-variant-numeric: tabular-nums;"></div>
                  </div>
              </div>
              
              <div class="workspace-gallery-area" id="workspaceGalleryArea" style="display: none; margin-top: 30px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                      <h2 style="margin: 0; font-size: 1.2rem;">Video đã xử lý (Phiên hiện tại)</h2>
                      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                          <button type="button" class="btn-secondary" id="wsSelectAllBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem;">
                              <span class="custom-cb-icon unchecked"></span> Chọn tất cả
                          </button>
                          <button type="button" class="btn-secondary" id="wsDeleteBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem; background: #ef4444; display: none;">
                              🗑 Xóa
                          </button>
                          <button type="button" class="btn-secondary" id="wsMuteBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem;">
                              🔇 Bật âm
                          </button>
                          <button type="button" class="btn-secondary" id="wsPauseBtn" style="width: auto; padding: 5px 15px; font-size: 0.9rem; background: #f59e0b;">
                              ⏸ Dừng
                          </button>
                      </div>
                  </div>
                  <div id="workspaceGalleryList" class="gallery-list"></div>
              </div>    
              <div style="margin-top: 20px;">
                  <button type="button" class="btn-process" id="workspaceDownloadAllBtn" style="background: linear-gradient(45deg, #f59e0b, #ef4444); display: flex; align-items: center; justify-content: center; gap: 8px;">
                      ⬇️ TẢI TẤT CẢ VỀ MÁY TÍNH (ZIP) ⬇️
                  </button>
              </div>
          </div>

      </div>
      <canvas id="processingCanvas"></canvas>
    ` }} />
  );
}
