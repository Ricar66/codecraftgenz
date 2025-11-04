// src/components/CrafterModal/CrafterModal.jsx
import React, { useState } from 'react';
import { apiRequest } from '../../lib/apiConfig.js';

const CrafterModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    area_interesse: '',
    mensagem: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const areasInteresse = [
    'Front-end',
    'Back-end',
    'Dados',
    'Design',
    'DevOps',
    'Outros'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];
    const fErrors = {};

    // Validação do nome
    if (!formData.nome.trim()) {
      errors.push('Nome é obrigatório');
      fErrors.nome = 'Informe seu nome completo';
    } else if (formData.nome.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
      fErrors.nome = 'Pelo menos 2 caracteres';
    }

    // Validação do email
    if (!formData.email.trim()) {
      errors.push('E-mail é obrigatório');
      fErrors.email = 'Informe um e-mail válido';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('E-mail deve ter um formato válido');
        fErrors.email = 'Formato de e-mail inválido';
      }
    }

    // Validação do telefone (opcional, mas se preenchido deve ser válido)
    if (formData.telefone.trim()) {
      const phoneRegex = /^[\d\s()-+]{10,}$/;
      if (!phoneRegex.test(formData.telefone.trim())) {
        errors.push('Telefone deve ter um formato válido');
        fErrors.telefone = 'Telefone inválido';
      }
    }

    // Estado (UF) se preenchido deve ter 2 letras
    if (formData.estado.trim() && formData.estado.trim().length !== 2) {
      errors.push('Estado deve conter 2 letras (UF)');
      fErrors.estado = 'Use 2 letras, ex: SP';
    }

    setFieldErrors(fErrors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação robusta
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest('/api/inscricoes', { method: 'POST', body: JSON.stringify(formData) });

      setSuccess(true);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cidade: '',
        estado: '',
        area_interesse: '',
        mensagem: ''
      });

      // Fechar modal após 3 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuccess(false);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quero ser um Crafter</h2>
          <button className="close-btn" onClick={handleClose} disabled={loading}>
            ×
          </button>
        </div>

        {success ? (
          <div className="success-content">
            <div className="success-icon">🎉</div>
            <h3>Inscrição recebida com sucesso!</h3>
            <p>Entraremos em contato em breve. Obrigado pelo seu interesse!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="crafter-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nome">Nome completo *</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Seu nome completo"
                required
              />
              {fieldErrors.nome && (
                <div className="field-error">{fieldErrors.nome}</div>
              )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">E-mail *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                required
              />
              {fieldErrors.email && (
                <div className="field-error">{fieldErrors.email}</div>
              )}
              </div>
              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
              />
              {fieldErrors.telefone && (
                <div className="field-error">{fieldErrors.telefone}</div>
              )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cidade">Cidade</label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  placeholder="Sua cidade"
                />
              </div>
              <div className="form-group">
                <label htmlFor="estado">Estado</label>
              <input
                type="text"
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
                placeholder="SP"
                maxLength={2}
              />
              {fieldErrors.estado && (
                <div className="field-error">{fieldErrors.estado}</div>
              )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="area_interesse">Área de Interesse</label>
                <select
                  id="area_interesse"
                  name="area_interesse"
                  value={formData.area_interesse}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione uma área</option>
                  {areasInteresse.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mensagem">Mensagem</label>
                <textarea
                  id="mensagem"
                  name="mensagem"
                  value={formData.mensagem}
                  onChange={handleInputChange}
                  placeholder="Conte-nos um pouco sobre você, sua experiência e por que quer ser um Crafter..."
                  rows={4}
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleClose} disabled={loading} className="cancel-btn">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Enviando...' : 'Enviar Inscrição'}
              </button>
            </div>
          </form>
        )}

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e1e8ed;
          }

          .modal-header h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 1.5rem;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            color: #7f8c8d;
            cursor: pointer;
            padding: 0;
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
          }

          .close-btn:hover:not(:disabled) {
            background: #f8f9fa;
            color: #2c3e50;
          }

          .close-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .crafter-form {
            padding: 2rem;
          }

          .form-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .form-group {
            flex: 1;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #2c3e50;
            font-weight: 500;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
          }

          .form-group textarea {
            resize: vertical;
            min-height: 100px;
          }

          .error-message {
            background: #fee;
            color: #c0392b;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            border: 1px solid #f5c6cb;
          }
          .field-error {
            margin-top: 6px;
            color: #c0392b;
            font-size: 0.9rem;
          }

          .form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
          }

          .cancel-btn,
          .submit-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
          }

          .cancel-btn {
            background: #f8f9fa;
            color: #6c757d;
            border: 2px solid #e1e8ed;
          }

          .cancel-btn:hover:not(:disabled) {
            background: #e9ecef;
            color: #495057;
          }

          .submit-btn {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
          }

          .submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #2980b9, #1f5f8b);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
          }

          .cancel-btn:disabled,
          .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .success-content {
            padding: 3rem 2rem;
            text-align: center;
          }

          .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .success-content h3 {
            color: #27ae60;
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }

          .success-content p {
            color: #7f8c8d;
            font-size: 1.1rem;
            line-height: 1.6;
          }

          @media (max-width: 768px) {
            .modal-content {
              margin: 1rem;
              max-height: calc(100vh - 2rem);
            }

            .modal-header {
              padding: 1rem 1.5rem;
            }

            .crafter-form {
              padding: 1.5rem;
            }

            .form-row {
              flex-direction: column;
              gap: 0;
            }

            .form-actions {
              flex-direction: column;
            }

            .success-content {
              padding: 2rem 1.5rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CrafterModal;