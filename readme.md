
## 基於 Node(express) 的文件切片上傳 demo


### 項目啟動
啟動命令後，訪問localhost:3000
```bash
  npm install // 安裝依賴
  node server.js
```


### 說明
- 前端指定 chunkSize 切片大小, 利用 Blob.slice() 切片, 注意上傳切片的idx要一並帶上 (這裡是包含在上傳文件名中blobName中的index)。切片的idx關係到後端合併切片的順序。
    ```js
      let blob = file.slice(start, start + chunkSize);
      let blobName = `${fname}.${index}.${fext}`;
      let blobFile = new File([blob], blobName)
    ```

- express 根據文件名及idx 創建暫時目錄存放切片，以idx的形式命名。如收到一個文件名為 haha.1.mp4 的切片，則創建一個暫時目錄 haha，內部文件名則是 1，2，3 這種純數字的形式。
  - haha
    - 1
    - 2
    - 3
    - ...
  
- 前端上傳完最後一個切片，掉用 /merge api 通知 express 合併所有切片

- express 用 stream + promise的形式合併。寫入流需要指定寫入的位置(start)，這樣可以支持並發執行寫入，而不需要串行執行。
  ```js
    const start = idx * chunkSize;
    // 指定位置寫入數據
    const writeStream = fse.createWriteStream(targetFile, {
      start,
    });
  ```

- 最後注意Promise.all中，需監聽讀取流，寫入流的錯誤事件。異常時reject promise。
  ```js
    readStream.on('error', reject);
    writeStream.on('error', reject);
  ```
  


