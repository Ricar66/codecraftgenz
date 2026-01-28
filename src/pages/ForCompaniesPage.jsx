// src/pages/ForCompaniesPage.jsx
import React, { useState, useCallback, memo } from 'react';
import { FaBuilding, FaUser, FaEnvelope, FaLaptopCode, FaMoneyBillWave, FaFileAlt, FaCheckCircle, FaRocket } from 'react-icons/fa';

import Navbar from '../components/Navbar/Navbar';
import styles from './ForCompaniesPage.module.css';

/**
 * Página B2B para solicitação de orçamentos
 * Otimizada para performance mobile
 */
const ForCompaniesPage = memo(() => {
  const [formData, setFormData] = useState({
    companyName: '',
    responsibleName: '',
    email: '',
    projectType: '',
    budget: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const projectTypes = [
    { value: 'web', label: 'Aplicação Web' },
    { value: 'mobile', label: 'App Mobile (iOS/Android)' },
    { value: 'desktop', label: 'Software Desktop' },
    { value: 'api', label: 'API/Backend' },
    { value: 'fullstack', label: 'Solução Completa' }
  ];

  const budgetRanges = [
    { value: 'under5k', label: 'Até R$ 5.000' },
    { value: '5k-15k', label: 'R$ 5.000 - R$ 15.000' },
    { value: '15k-50k', label: 'R$ 15.000 - R$ 50.000' },
    { value: '50k-100k', label: 'R$ 50.000 - R$ 100.000' },
    { value: 'above100k', label: 'Acima de R$ 100.000' },
    { value: 'undefined', label: 'A definir' }
  ];

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpa erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Nome da empresa é obrigatório';
    }

    if (!formData.responsibleName.trim()) {
      newErrors.responsibleName = 'Nome do responsável é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.projectType) {
      newErrors.projectType = 'Selecione o tipo de projeto';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descreva sua ideia';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Descrição deve ter pelo menos 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simula envio - integrar com backend depois
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Erro ao enviar:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm]);

  if (isSubmitted) {
    return (
      <>
        <Navbar />
        <div className={styles.page}>
          <div className={styles.successContainer}>
            <FaCheckCircle className={styles.successIcon} aria-hidden="true" />
            <h1 className={styles.successTitle}>Solicitação Enviada!</h1>
            <p className={styles.successText}>
              Obrigado pelo interesse! Nossa equipe entrará em contato em até 48 horas úteis para discutir seu projeto.
            </p>
            <a href="/" className={styles.successButton}>
              Voltar ao Início
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>
              <FaRocket aria-hidden="true" /> Para Empresas
            </span>
            <h1 className={styles.heroTitle}>
              Transforme sua <span className={styles.highlight}>Ideia</span> em Software
            </h1>
            <p className={styles.heroSubtitle}>
              Desenvolvemos soluções tecnológicas sob medida para empresas que buscam inovação, qualidade e resultados.
            </p>
          </div>
        </section>

        {/* Formulário */}
        <section className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <h2 className={styles.formTitle}>Solicite um Orçamento</h2>

            {/* Nome da Empresa */}
            <div className={styles.formGroup}>
              <label htmlFor="companyName" className={styles.label}>
                <FaBuilding aria-hidden="true" /> Nome da Empresa *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className={`${styles.input} ${errors.companyName ? styles.inputError : ''}`}
                placeholder="Ex: TechCorp Ltda"
                autoComplete="organization"
              />
              {errors.companyName && <span className={styles.error}>{errors.companyName}</span>}
            </div>

            {/* Nome do Responsável */}
            <div className={styles.formGroup}>
              <label htmlFor="responsibleName" className={styles.label}>
                <FaUser aria-hidden="true" /> Nome do Responsável *
              </label>
              <input
                type="text"
                id="responsibleName"
                name="responsibleName"
                value={formData.responsibleName}
                onChange={handleChange}
                className={`${styles.input} ${errors.responsibleName ? styles.inputError : ''}`}
                placeholder="Seu nome completo"
                autoComplete="name"
              />
              {errors.responsibleName && <span className={styles.error}>{errors.responsibleName}</span>}
            </div>

            {/* Email Corporativo */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                <FaEnvelope aria-hidden="true" /> Email Corporativo *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="contato@empresa.com"
                autoComplete="email"
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            {/* Tipo de Projeto */}
            <div className={styles.formGroup}>
              <label htmlFor="projectType" className={styles.label}>
                <FaLaptopCode aria-hidden="true" /> Tipo de Projeto *
              </label>
              <select
                id="projectType"
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                className={`${styles.select} ${errors.projectType ? styles.inputError : ''}`}
              >
                <option value="">Selecione uma opção</option>
                {projectTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.projectType && <span className={styles.error}>{errors.projectType}</span>}
            </div>

            {/* Orçamento Estimado */}
            <div className={styles.formGroup}>
              <label htmlFor="budget" className={styles.label}>
                <FaMoneyBillWave aria-hidden="true" /> Orçamento Estimado
              </label>
              <select
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="">Selecione uma faixa (opcional)</option>
                {budgetRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* Descrição da Ideia */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                <FaFileAlt aria-hidden="true" /> Descrição do Projeto *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="Descreva sua ideia, funcionalidades desejadas, público-alvo, prazo estimado..."
                rows={5}
              />
              {errors.description && <span className={styles.error}>{errors.description}</span>}
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </button>

            <p className={styles.formNote}>
              * Campos obrigatórios. Seus dados estão protegidos conforme nossa Política de Privacidade.
            </p>
          </form>
        </section>
      </div>
    </>
  );
});

ForCompaniesPage.displayName = 'ForCompaniesPage';

export default ForCompaniesPage;
