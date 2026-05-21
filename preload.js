const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getMousePosition: () => ipcRenderer.invoke('get-mouse-position'),
  checkMandatoryUpdate: () => ipcRenderer.invoke('check-mandatory-update'),
  
  /* 
  ===================================================================
  SCREENSHOT CAPTURE SYSTEM (TEMPORARILY DISABLED)
  ===================================================================
  captureDisplay: async () => {
    try {
      // Access the internal Chromium engine hardware capture stream directly
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            minWidth: 960,
            maxWidth: 1280,
            minHeight: 540,
            maxHeight: 720
          }
        }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          
          // Render layout coordinates straight into a canvas wrapper
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          
          // Drop streaming active tracks instantly to eliminate background RAM accumulation
          stream.getTracks().forEach(track => track.stop());
          
          // Compress matrix immediately into a lightweight 60% quality JPEG Base64 data-string
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
      });
    } catch (err) {
      console.error("Hardware screen capture execution bypassed:", err);
      return null;
    }
  }
  ===================================================================
  */
});