import React, { useState, useRef, useEffect } from 'react';
import './styles.css';

interface EditableImageProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function EditableImage({
  src,
  alt = '图片',
  width = '100%',
  height = 'auto',
  className = '',
}: EditableImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 处理图片上传
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageSrc(result);
        // 打开编辑模态框
        setIsEditModalOpen(true);
        // 延迟加载到canvas以便编辑
        setTimeout(() => {
          loadImageToCanvas(result);
        }, 100);
      };
      reader.readAsDataURL(file);
    }
    // 重置文件输入，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 加载图片到canvas
  const loadImageToCanvas = (src: string) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = src;
  };

  // 打开在线编辑器
  const handleOpenEditor = () => {
    // 使用 Photopea 在线图片编辑器（类似 Photoshop）
    // 或者使用其他在线编辑器如 Pixlr
    try {
      // 方案1：使用 Photopea
      const encodedImage = encodeURIComponent(imageSrc);
      const photopeaUrl = `https://www.photopea.com/#%7B%22files%22:%5B%22${encodedImage}%22%5D%7D`;
      window.open(photopeaUrl, '_blank', 'width=1200,height=800');
    } catch (error) {
      // 方案2：使用 Pixlr 作为备选
      window.open(`https://pixlr.com/editor/?image=${encodeURIComponent(imageSrc)}`, '_blank');
    }
  };

  // 打开编辑模式（上传新图片）
  const handleEdit = () => {
    fileInputRef.current?.click();
  };

  // 保存canvas内容为图片
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
        setIsEditModalOpen(false);
      }
    }, 'image/png');
  };

  // 下载图片
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = alt || 'image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 初始化时加载图片到canvas
  useEffect(() => {
    if (isEditModalOpen && canvasRef.current) {
      loadImageToCanvas(imageSrc);
    }
  }, [isEditModalOpen, imageSrc]);

  return (
    <div className={`editable-image-container ${className}`}>
      <div className="editable-image-wrapper">
        <img
          src={imageSrc}
          alt={alt}
          style={{
            maxWidth: '100%',
            height: height === 'auto' ? 'auto' : `${height}px`,
            width: typeof width === 'number' ? `${width}px` : width,
            border: '1px solid #e1e4e8',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'block',
            margin: '0 auto',
            cursor: 'pointer',
          }}
          onClick={handleOpenEditor}
          title="点击图片在线编辑"
        />
        <div className="editable-image-actions">
          <button
            className="edit-btn"
            onClick={handleEdit}
            title="上传新图片"
            aria-label="上传新图片"
          >
            📤 上传
          </button>
          <button
            className="editor-btn"
            onClick={handleOpenEditor}
            title="在线编辑图片"
            aria-label="在线编辑图片"
          >
            ✏️ 编辑
          </button>
          <button
            className="download-btn"
            onClick={handleDownload}
            title="下载图片"
            aria-label="下载图片"
          >
            💾 下载
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      {/* 编辑模态框 */}
      {isEditModalOpen && (
        <div className="edit-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>编辑图片</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="edit-modal-body">
              <img ref={imgRef} style={{ display: 'none' }} alt="preview" />
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
              <div className="edit-tips">
                <p>💡 提示：</p>
                <ul>
                  <li>点击"在线编辑"按钮可以在专业的图片编辑器中编辑</li>
                  <li>当前预览仅支持查看，完整编辑功能请使用在线编辑器</li>
                </ul>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>
                取消
              </button>
              <button className="save-btn" onClick={handleSave}>
                保存
              </button>
              <button className="editor-btn" onClick={handleOpenEditor}>
                在线编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

