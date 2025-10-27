// NewsHistoryModal - Modal para histórico completo de notícias
// VERSION: v1.0.3 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team

import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const NewsHistoryModal = ({ isOpen, onClose, news, onAcknowledge }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, critical, solved, recent
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Resetar filtros quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setFilterType('all');
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Filtrar notícias
  const filteredNews = news.filter(item => {
    // Filtro de busca
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de tipo
    let matchesFilter = true;
    switch (filterType) {
      case 'critical':
        matchesFilter = item.is_critical === 'Y';
        break;
      case 'solved':
        matchesFilter = item.solved === true;
        break;
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        matchesFilter = new Date(item.createdAt) >= oneWeekAgo;
        break;
      default:
        matchesFilter = true;
    }

    return matchesSearch && matchesFilter;
  });

  // Paginação
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNews = filteredNews.slice(startIndex, endIndex);

  // Função para verificar se passou de 12 horas
  const isExpired12Hours = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 12;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 pt-20">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Histórico de Notícias
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por título ou conteúdo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
              />
            </div>

            {/* Filtro de tipo */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterType('critical')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filterType === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Críticas
              </button>
              <button
                onClick={() => setFilterType('solved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filterType === 'solved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Resolvidas
              </button>
              <button
                onClick={() => setFilterType('recent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filterType === 'recent'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Recentes
              </button>
            </div>
          </div>
        </div>

        {/* Lista de notícias */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentNews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterType !== 'all' 
                  ? 'Nenhuma notícia encontrada com os filtros aplicados'
                  : 'Nenhuma notícia disponível'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentNews.map(item => {
                const isSolved = item.solved === true;
                const isExpired = item.is_critical === 'Y' && (item.acknowledged || false) && isExpired12Hours(item.createdAt);
                const shouldRemoveHighlight = isExpired && !isSolved;
                
                return (
                  <div
                    key={item._id}
                    className={`border rounded-lg p-4 ${
                      item.is_critical === 'Y' && !shouldRemoveHighlight ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'
                    } ${isSolved ? 'solved-news-frame' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        {item.title}
                      </h3>
                      <div className="flex flex-col items-end gap-2">
                        {isSolved && (
                          <span className="solved-badge">
                            Resolvido
                          </span>
                        )}
                        {item.is_critical === 'Y' && !isSolved && !shouldRemoveHighlight && (
                          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs font-medium">
                            Crítica
                          </span>
                        )}
                      </div>
                    </div>

                    <div 
                      className={`text-gray-600 dark:text-gray-400 mb-3 prose prose-sm dark:prose-invert max-w-none ${isSolved ? 'solved-news-content' : ''}`}
                      dangerouslySetInnerHTML={{ __html: item.content || '' }}
                    />

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {item.createdAt && new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredNews.length)} de {filteredNews.length} notícias
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsHistoryModal;
