/**
 * VeloHub V3 - VeloNews Admin Component
 * VERSION: v1.2.0 | DATE: 2025-01-31 | AUTHOR: VeloHub Development Team
 * 
 * Componente para criar e editar notícias do VeloHub com suporte a imagens e vídeos
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, Image, Video, Trash2, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { API_BASE_URL } from '../config/api-config';

const VeloNewsAdmin = ({ isOpen, onClose, newsToEdit = null }) => {
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar dados quando newsToEdit mudar
  useEffect(() => {
    if (newsToEdit) {
      setTitulo(newsToEdit.title || newsToEdit.titulo || '');
      setConteudo(newsToEdit.content || newsToEdit.conteudo || '');
      setIsCritical(newsToEdit.is_critical === 'Y' || newsToEdit.isCritical === true || false);
      setImages(newsToEdit.images || []);
      setVideos(newsToEdit.videos || []);
    } else {
      // Resetar quando criar nova notícia
      setTitulo('');
      setConteudo('');
      setIsCritical(false);
      setImages([]);
      setVideos([]);
    }
    setError('');
    setSuccess('');
  }, [newsToEdit, isOpen]);

  // Configuração do editor Quill
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  if (!isOpen) return null;

  // Processar arquivo de imagem
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Apenas arquivos de imagem são permitidos');
        continue;
      }

      // Limitar tamanho da imagem (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(`Imagem ${file.name} excede 5MB. Por favor, use uma imagem menor ou comprima antes de enviar.`);
        continue;
      }

      try {
        // Usar Promise para aguardar o processamento
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (event) => {
            try {
              const dataUrl = event.target.result;
              
              // Verificar se o dataUrl é válido
              if (!dataUrl || !dataUrl.includes(',')) {
                reject(new Error('Erro ao processar imagem: formato inválido'));
                return;
              }
              
              const base64 = dataUrl.split(',')[1];
              
              setImages(prev => [...prev, {
                url: dataUrl,
                data: base64,
                type: file.type,
                name: file.name,
                size: file.size
              }]);
              
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          
          reader.onerror = (error) => {
            reject(new Error(`Erro ao ler arquivo: ${error.message || 'Erro desconhecido'}`));
          };
          
          reader.onabort = () => {
            reject(new Error('Leitura do arquivo foi cancelada'));
          };
          
          reader.readAsDataURL(file);
        });
      } catch (err) {
        setError(`Erro ao processar imagem ${file.name}: ${err.message}`);
        console.error('Erro detalhado:', err);
      }
    }
    
    e.target.value = ''; // Limpar input
  };

  // Extrair ID do YouTube de diferentes formatos de URL
  const extractYouTubeId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Adicionar vídeo do YouTube via URL
  const handleYouTubeUrl = () => {
    const url = prompt('Cole a URL do vídeo do YouTube:');
    if (!url) return;

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setError('URL do YouTube inválida. Use formatos como: https://www.youtube.com/watch?v=VIDEO_ID ou https://youtu.be/VIDEO_ID');
      return;
    }

    setVideos(prev => [...prev, {
      youtubeId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      type: 'youtube',
      name: `YouTube Video ${videoId}`
    }]);
    
    setError('');
  };

  // Remover imagem
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Remover vídeo
  const removeVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  // Salvar notícia
  const handleSave = async () => {
    if (!titulo.trim() || !conteudo.trim()) {
      setError('Título e conteúdo são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        isCritical: isCritical,
        images: images.map(img => ({
          url: img.url,
          data: img.data,
          type: img.type,
          name: img.name
        })),
        videos: videos.map(vid => ({
          youtubeId: vid.youtubeId || null,
          url: vid.url,
          embedUrl: vid.embedUrl || null,
          data: vid.data || null, // Manter compatibilidade com vídeos em base64 existentes
          type: vid.type,
          name: vid.name
        }))
      };

      const url = newsToEdit 
        ? `${API_BASE_URL}/velo-news/${newsToEdit._id}`
        : `${API_BASE_URL}/velo-news`;
      
      const method = newsToEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar notícia');
      }

      setSuccess(newsToEdit ? 'Notícia atualizada com sucesso!' : 'Notícia criada com sucesso!');
      
      // Limpar formulário se for criação
      if (!newsToEdit) {
        setTitulo('');
        setConteudo('');
        setIsCritical(false);
        setImages([]);
        setVideos([]);
      }

      // Fechar após 2 segundos
      setTimeout(() => {
        onClose();
        if (window.location) window.location.reload();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Erro ao salvar notícia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {newsToEdit ? 'Editar Notícia' : 'Nova Notícia'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white text-3xl"
          >
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Mensagens */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              placeholder="Digite o título da notícia"
            />
          </div>

          {/* Conteúdo com Editor Rico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conteúdo *
            </label>
            <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
              <ReactQuill
                theme="snow"
                value={conteudo}
                onChange={setConteudo}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Digite o conteúdo da notícia com formatação..."
                style={{
                  minHeight: '300px',
                }}
                className="quill-editor-custom"
              />
            </div>
            <style jsx global>{`
              .quill-editor-custom .ql-container {
                min-height: 250px;
                font-size: 16px;
                color: var(--text-color);
              }
              .quill-editor-custom .ql-editor {
                min-height: 250px;
                color: #1f2937;
              }
              .dark .quill-editor-custom .ql-editor {
                color: #e5e7eb;
              }
              .quill-editor-custom .ql-toolbar {
                border-top-left-radius: 0.5rem;
                border-top-right-radius: 0.5rem;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
              }
              .dark .quill-editor-custom .ql-toolbar {
                background: #374151;
                border-bottom: 1px solid #4b5563;
              }
              .quill-editor-custom .ql-container {
                border-bottom-left-radius: 0.5rem;
                border-bottom-right-radius: 0.5rem;
                border: none;
              }
              .quill-editor-custom .ql-stroke {
                stroke: #6b7280;
              }
              .dark .quill-editor-custom .ql-stroke {
                stroke: #9ca3af;
              }
              .quill-editor-custom .ql-fill {
                fill: #6b7280;
              }
              .dark .quill-editor-custom .ql-fill {
                fill: #9ca3af;
              }
              .quill-editor-custom .ql-picker-label {
                color: #6b7280;
              }
              .dark .quill-editor-custom .ql-picker-label {
                color: #9ca3af;
              }
              .quill-editor-custom .ql-editor.ql-blank::before {
                color: #9ca3af;
                font-style: normal;
              }
            `}</style>
          </div>

          {/* Crítica */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isCritical"
              checked={isCritical}
              onChange={(e) => setIsCritical(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isCritical" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Notícia crítica
            </label>
          </div>

          {/* Upload de Imagens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Imagens
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <label className="flex items-center justify-center cursor-pointer">
                <Upload className="w-5 h-5 mr-2 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Clique para selecionar imagens ou arraste aqui
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img.url}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-32 object-cover rounded border border-gray-200 dark:border-gray-700"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vídeos do YouTube */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vídeos (YouTube)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <button
                type="button"
                onClick={handleYouTubeUrl}
                className="w-full flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                <Video className="w-5 h-5 mr-2 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Adicionar vídeo do YouTube (cole a URL)
                </span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Formatos aceitos: youtube.com/watch?v=... ou youtu.be/...
              </p>
            </div>
            {videos.length > 0 && (
              <div className="mt-4 space-y-2">
                {videos.map((vid, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="flex items-center">
                      <Video className="w-5 h-5 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {vid.type === 'youtube' ? `YouTube: ${vid.youtubeId}` : vid.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeVideo(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeloNewsAdmin;

