// src/pages/ForCompaniesPage.jsx
import React, { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, User, Mail, Monitor, Banknote, FileText,
  CheckCircle, Rocket, ArrowRight, Code2, Trophy,
  Target, Users, Shield, Zap
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { createProposal } from '../services/proposalAPI';
import styles from './ForCompaniesPage.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const comoFuncionaSteps = [
  {
    icon: <Target size={28} />,
    number: '01',
    title: 'Você posta o desafio',
    description: 'Define o problema, a stack e o prazo. Em minutos, sem burocracia.',
  },
  {
    icon: <Code2 size={28} />,
    number: '02',
    title: 'Crafters resolvem',
    description: 'Nossa comunidade aceita o desafio e entrega código real, revisado por mentor sênior.',
  },
  {
    icon: <Trophy size={28} />,
    number: '03',
    title: 'Você escolhe os melhores',
    description: 'Veja perfis, entregas e histórico. Contrate com segurança, baseado em performance real.',
  },
];

const beneficios = [
  {
    icon: <Trophy size={22} />,
    title: 'Talentos filtrados por performance',
    description: 'Você não vê currículo. Você vê código entregue, prazo cumprido e revisão de mentor.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Zero burocracia',
    description: 'Sem processo seletivo longo. O desafio já faz a triagem. Você só avalia os resultados.',
  },
  {
    icon: <Users size={22} />,
    title: 'Squad sob demanda',
    description: 'Precisa de um time? Montamos um squad dedicado, full-stack, para o seu projeto.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Mentoria inclusa',
    description: 'Cada entrega é revisada por um mentor sênior antes de chegar até você.',
  },
];

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

  const fieldErrorStyle = { color: '#f87171', fontSize: '0.8rem', marginTop: '4px' };
  const charCounterStyle = { color: '#6B7280', fontSize: '0.8rem', marginTop: '4px', textAlign: 'right' };

  const validateField = useCallback((field, value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    switch (field) {
      case 'companyName':
        if (!value.trim()) return 'Nome da empresa é obrigatório';
        if (value.length > 256) return 'Máximo de 256 caracteres';
        return '';
      case 'responsibleName':
        if (!value.trim()) return 'Nome do responsável é obrigatório';
        if (value.length > 256) return 'Máximo de 256 caracteres';
        return '';
      case 'email':
        if (!value.trim()) return 'Email é obrigatório';
        if (value.length > 256) return 'Máximo de 256 caracteres';
        if (!emailRegex.test(value)) return 'Email inválido';
        return '';
      case 'projectType':
        if (!value) return 'Selecione o tipo de projeto';
        return '';
      case 'description':
        if (!value.trim()) return 'Descreva sua ideia';
        if (value.trim().length < 20) return 'Descrição deve ter pelo menos 20 caracteres';
        if (value.length > 5000) return 'Máximo de 5000 caracteres';
        return '';
      default:
        return '';
    }
  }, []);

  const handleBlur = useCallback((field) => {
    const err = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: err }));
  }, [formData, validateField]);

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
      await createProposal({
        companyName: formData.companyName,
        contactName: formData.responsibleName,
        email: formData.email,
        projectType: formData.projectType,
        budgetRange: formData.budget,
        description: formData.description,
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Erro ao enviar proposta:', error);
      setErrors({ submit: 'Erro ao enviar proposta. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formData]);

  if (isSubmitted) {
    return (
      <>
        <Navbar />
        <div className={`${styles.page} starfield-bg`}>
          <div className={styles.successContainer}>
            <CheckCircle className={styles.successIcon} aria-hidden="true" />
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
      <div className={`${styles.page} starfield-bg`}>

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <motion.div
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.span className={styles.heroBadge} variants={fadeUp}>
              <Building2 size={14} aria-hidden="true" /> Para Empresas
            </motion.span>
            <motion.h1 className={styles.heroTitle} variants={fadeUp}>
              Encontre talentos validados por{' '}
              <span className={styles.highlight}>código real</span>,{' '}
              não por currículo.
            </motion.h1>
            <motion.p className={styles.heroSubtitle} variants={fadeUp}>
              Poste um desafio real, receba entregas de crafters, escolha os melhores.
              Sem processo seletivo longo. Sem currículo bonito que não entrega.
            </motion.p>
            <motion.div className={styles.heroCtas} variants={fadeUp}>
              <button
                className={styles.heroCtaPrimary}
                onClick={() => document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Solicitar orçamento <ArrowRight size={16} />
              </button>
              <button
                className={styles.heroCtaSecondary}
                onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver como funciona
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ── COMO FUNCIONA ── */}
        <section id="como-funciona" className={styles.comoFuncionaSection}>
          <motion.div
            className={styles.comoFuncionaInner}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div className={styles.sectionHeader} variants={fadeUp}>
              <span className={styles.sectionBadge}>Processo</span>
              <h2 className={styles.sectionTitle}>Como funciona em 3 passos</h2>
              <p className={styles.sectionLead}>Do briefing à contratação, sem fricção.</p>
            </motion.div>
            <div className={styles.comoFuncionaGrid}>
              {comoFuncionaSteps.map((s, i) => (
                <React.Fragment key={i}>
                  <motion.div
                    className={styles.comoFuncionaCard}
                    variants={fadeUp}
                  >
                    <div className={styles.comoFuncionaIconWrap}>{s.icon}</div>
                    <span className={styles.comoFuncionaNumber}>{s.number}</span>
                    <h3 className={styles.comoFuncionaCardTitle}>{s.title}</h3>
                    <p className={styles.comoFuncionaCardDesc}>{s.description}</p>
                  </motion.div>
                  {i < comoFuncionaSteps.length - 1 && (
                    <div className={styles.comoFuncionaArrow} aria-hidden="true">
                      <ArrowRight size={20} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── BENEFÍCIOS ── */}
        <section className={styles.beneficiosSection}>
          <motion.div
            className={styles.beneficiosInner}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div className={styles.sectionHeader} variants={fadeUp}>
              <span className={styles.sectionBadge}>Vantagens</span>
              <h2 className={styles.sectionTitle}>O que você ganha</h2>
              <p className={styles.sectionLead}>Por que empresas que querem resultado usam a CodeCraft.</p>
            </motion.div>
            <div className={styles.beneficiosGrid}>
              {beneficios.map((b, i) => (
                <motion.div key={i} className={styles.beneficioCard} variants={fadeUp}>
                  <div className={styles.beneficioIconWrap}>{b.icon}</div>
                  <h3 className={styles.beneficioTitle}>{b.title}</h3>
                  <p className={styles.beneficioDesc}>{b.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── FORMULÁRIO ── */}
        <section id="orcamento" className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <h2 className={styles.formTitle}>Solicite um Orçamento</h2>

            {/* Nome da Empresa */}
            <div className={styles.formGroup}>
              <label htmlFor="companyName" className={styles.label}>
                <Building2 aria-hidden="true" /> Nome da Empresa *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                onBlur={() => handleBlur('companyName')}
                className={`${styles.input} ${errors.companyName ? styles.inputError : ''}`}
                placeholder="Ex: TechCorp Ltda"
                autoComplete="organization"
                maxLength={256}
                aria-invalid={!!errors.companyName}
                aria-describedby={errors.companyName ? 'companyName-error' : undefined}
              />
              {errors.companyName && <span id="companyName-error" style={fieldErrorStyle}>{errors.companyName}</span>}
            </div>

            {/* Nome do Responsável */}
            <div className={styles.formGroup}>
              <label htmlFor="responsibleName" className={styles.label}>
                <User aria-hidden="true" /> Nome do Responsável *
              </label>
              <input
                type="text"
                id="responsibleName"
                name="responsibleName"
                value={formData.responsibleName}
                onChange={handleChange}
                onBlur={() => handleBlur('responsibleName')}
                className={`${styles.input} ${errors.responsibleName ? styles.inputError : ''}`}
                placeholder="Seu nome completo"
                autoComplete="name"
                maxLength={256}
                aria-invalid={!!errors.responsibleName}
                aria-describedby={errors.responsibleName ? 'responsibleName-error' : undefined}
              />
              {errors.responsibleName && <span id="responsibleName-error" style={fieldErrorStyle}>{errors.responsibleName}</span>}
            </div>

            {/* Email Corporativo */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                <Mail aria-hidden="true" /> Email Corporativo *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur('email')}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="contato@empresa.com"
                autoComplete="email"
                maxLength={256}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <span id="email-error" style={fieldErrorStyle}>{errors.email}</span>}
            </div>

            {/* Tipo de Projeto */}
            <div className={styles.formGroup}>
              <label htmlFor="projectType" className={styles.label}>
                <Monitor aria-hidden="true" /> Tipo de Projeto *
              </label>
              <select
                id="projectType"
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                onBlur={() => handleBlur('projectType')}
                className={`${styles.select} ${errors.projectType ? styles.inputError : ''}`}
                aria-invalid={!!errors.projectType}
                aria-describedby={errors.projectType ? 'projectType-error' : undefined}
              >
                <option value="">Selecione uma opção</option>
                {projectTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.projectType && <span id="projectType-error" style={fieldErrorStyle}>{errors.projectType}</span>}
            </div>

            {/* Orçamento Estimado */}
            <div className={styles.formGroup}>
              <label htmlFor="budget" className={styles.label}>
                <Banknote aria-hidden="true" /> Orçamento Estimado
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
                <FileText aria-hidden="true" /> Descrição do Projeto *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={() => handleBlur('description')}
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="Descreva sua ideia, funcionalidades desejadas, público-alvo, prazo estimado..."
                rows={5}
                maxLength={5000}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : 'description-counter'}
              />
              {errors.description && <span id="description-error" style={fieldErrorStyle}>{errors.description}</span>}
              <span id="description-counter" style={charCounterStyle}>
                {formData.description.length} / 5000 caracteres
              </span>
            </div>

            {errors.submit && (
              <p className={styles.errorMessage} style={{ textAlign: 'center', marginBottom: '1rem' }}>
                {errors.submit}
              </p>
            )}

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
