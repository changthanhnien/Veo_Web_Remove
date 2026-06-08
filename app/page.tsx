"use client";

import Script from 'next/script';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Next.js client-side script loader
    const checkAndInit = () => {
      if (typeof window !== "undefined" && (window as any).initVeoApp) {
        // Execute the main script logic only once
        if (!(window as any)._veoAppInitialized) {
            (window as any).initVeoApp();
            (window as any)._veoAppInitialized = true;
        }
      } else {
        setTimeout(checkAndInit, 100);
      }
    };
    checkAndInit();
  }, []);

  return (
    <>
      <Script src="/jszip.min.js" strategy="beforeInteractive" />
      <Script src="/script.js" strategy="lazyOnload" />

      <div className="container" style={{ position: 'relative' }}>
          <button type="button" className="btn-secondary" id="historyToggleBtn" style={{ position: 'absolute', top: '30px', right: '30px', width: 'auto', background: '#8b5cf6', padding: '8px 15px', zIndex: 10 }}>📜 Lịch sử</button>
          <h1>Xóa Logo Veo3 Hàng Loạt</h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p className="subtitle" style={{ margin: 0 }}>Tải lên nhiều video cùng lúc, chọn vị trí xóa 1 lần và áp dụng cho tất cả.</p>
              <button type="button" className="btn-secondary" id="resetQueueBtn" style={{ width: 'auto', background: '#ef4444', padding: '6px 12px' }}>🗑 Xóa làm lại</button>
          </div>

          <div className="upload-area" id="dropZone">
              <div className="upload-icon">📂</div>
              <h3 style={{ marginBottom: '5px' }}>Kéo thả hoặc Bấm chọn Nhiều Video Cùng Lúc</h3>
          </div>
          <input type="file" id="videoInput" accept="video/*" multiple style={{ display: 'none' }} />

          <div id="historyModal" className="modal">
              <div className="modal-content">
                  <span className="close-btn" id="closeHistoryBtn">&times;</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px', paddingRight: '40px' }}>
                      <h2 style={{ margin: 0 }}>Lịch sử Video đã xử lý</h2>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button type="button" className="btn-secondary" id="historySelectAllBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem' }}>
                              <span className="custom-cb-icon unchecked"></span> Chọn tất cả
                          </button>
                          <button type="button" className="btn-secondary" id="historyDeleteBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem', background: '#ef4444', display: 'none' }}>
                              🗑 Xóa
                          </button>
                          <button type="button" className="btn-secondary" id="globalMuteBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem' }}>
                              🔇 Tắt âm
                          </button>
                          <button type="button" className="btn-secondary" id="globalPauseBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem', background: '#f59e0b' }}>
                              ⏸ Dừng
                          </button>
                          <button type="button" className="btn-secondary" id="historyDownloadAllBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem', background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              📥 Tải tất cả
                          </button>
                          <button type="button" className="btn-secondary" id="historyClearAllBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem', background: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              🗑 Xóa Lịch Sử
                          </button>
                      </div>
                  </div>
                  <div id="galleryList" className="gallery-list">
                  </div>
              </div>
          </div>

          <div className="queue-list" id="queueList" style={{ display: 'none' }}>
              <h3>Danh sách Video Đang Chờ (<span id="queueCount">0</span>)</h3>
              <ul id="videoItems"></ul>
          </div>

          <div className="workspace" id="workspace" style={{ display: 'none' }}>
              <div className="preview-layout">
                  <div className="video-box" id="boxBefore">
                      <h3>1. Chỉnh vùng cần xóa (Before)</h3>
                      <p className="instruction" id="manualInstruction">Kéo và thay đổi kích thước khung đỏ sao cho ôm khít vùng cần xóa.</p>
                      <div className="video-container" id="videoContainer">
                          <video id="previewVideo" playsInline autoPlay muted controls></video>
                          <div id="selectionBox">
                              <div className="resize-handle" id="resizeHandle"></div>
                          </div>
                      </div>
                      <p className="instruction" style={{ fontSize: '0.8rem', marginTop: '5px', color: '#94a3b8' }}>*Có thể ấn vào video để Play/Pause</p>
                      <button type="button" className="btn-secondary" id="applyAllBtn" style={{ width: '100%', marginTop: '10px', background: '#6366f1', fontWeight: 600 }}>
                          🎯 Áp Dụng Vị Trí Này Cho Tất Cả Video
                      </button>
                  </div>

                  <div className="video-box" id="boxAfter">
                      <h3>2. Xem trước kết quả (After)</h3>
                      <div className="video-container">
                          <video id="resultVideo" playsInline autoPlay muted controls></video>
                      </div>
                      <button type="button" className="btn-process" id="testCurrentBtn" style={{ marginTop: '10px', width: '100%', fontSize: '1rem', padding: '10px' }}>
                          🧪 Thử Xóa Video Này
                      </button>
                  </div>
              </div>

              <div className="global-actions">
                  <button type="button" className="btn-process" id="processAllBtn" style={{ background: 'linear-gradient(45deg, #10b981, #3b82f6)' }}>
                      🚀 BẮT ĐẦU XÓA LOGO TOÀN BỘ VIDEO 🚀
                  </button>
                  
                  <div style={{ minHeight: '60px' }}>
                      <div className="progress-container" id="progressContainer" style={{ visibility: 'hidden', marginTop: '20px' }}>
                          <div className="progress-bar" id="progressBar"></div>
                      </div>
                      <div id="statusBox" style={{ marginTop: '15px', fontWeight: 600, textAlign: 'center', minHeight: '24px', color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}></div>
                  </div>
              </div>
              
              <div className="workspace-gallery-area" id="workspaceGalleryArea" style={{ display: 'none', marginTop: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Video đã xử lý (Phiên hiện tại)</h2>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button type="button" className="btn-secondary" id="wsSelectAllBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem' }}>
                              <span className="custom-cb-icon unchecked"></span> Chọn tất cả
                          </button>
                          <button type="button" className="btn-secondary" id="wsDeleteBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem', background: '#ef4444', display: 'none' }}>
                              🗑 Xóa
                          </button>
                          <button type="button" className="btn-secondary" id="wsMuteBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem' }}>
                              🔇 Bật âm
                          </button>
                          <button type="button" className="btn-secondary" id="wsPauseBtn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.9rem', background: '#f59e0b' }}>
                              ⏸ Dừng
                          </button>
                      </div>
                  </div>
                  <div id="workspaceGalleryList" className="gallery-list"></div>
              </div>    
              <div style={{ marginTop: '20px' }}>
                  <button type="button" className="btn-process" id="workspaceDownloadAllBtn" style={{ background: 'linear-gradient(45deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      ⬇️ TẢI TẤT CẢ VỀ MÁY TÍNH (ZIP) ⬇️
                  </button>
              </div>
          </div>

      </div>
      
      {/* Moved canvas outside of container for exact structural match */}
      <canvas id="processingCanvas"></canvas>
    </>
  );
}
