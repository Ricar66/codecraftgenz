// src/pages/PrivacyPolicyPage.jsx
// Política de Privacidade - Conforme LGPD
import { Link } from 'react-router-dom';
import {
  FaShieldAlt,
  FaArrowLeft,
  FaDatabase,
  FaUserShield,
  FaLock,
  FaCookieBite,
  FaUserCog,
  FaEnvelope,
  FaBalanceScale
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './LegalPage.module.css';

function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <Link to="/" className={styles.backLink}>
            <FaArrowLeft /> Voltar ao início
          </Link>
          <div className={styles.heroBadge}>
            <FaShieldAlt />
            <span>Privacidade</span>
          </div>
          <h1 className={styles.heroTitle}>
            Política de <span className={styles.highlight}>Privacidade</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Saiba como coletamos, usamos e protegemos seus dados pessoais.
          </p>
          <p className={styles.lastUpdate}>
            Última atualização: Janeiro de 2025
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className={styles.contentSection}>
        {/* Table of Contents */}
        <div className={styles.toc}>
          <h3 className={styles.tocTitle}>Índice</h3>
          <ol className={styles.tocList}>
            <li><a href="#introducao">Introdução</a></li>
            <li><a href="#dados-coletados">Dados Coletados</a></li>
            <li><a href="#uso-dados">Uso dos Dados</a></li>
            <li><a href="#compartilhamento">Compartilhamento de Dados</a></li>
            <li><a href="#armazenamento">Armazenamento e Segurança</a></li>
            <li><a href="#cookies">Cookies e Tecnologias</a></li>
            <li><a href="#direitos">Seus Direitos (LGPD)</a></li>
            <li><a href="#contato">Contato do Encarregado</a></li>
          </ol>
        </div>

        {/* Introduction */}
        <div id="introducao" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaShieldAlt />
            1. Introdução
          </h2>
          <p className={styles.text}>
            A <span className={styles.highlight2}>CodeCraft GenZ</span> ("nós", "nosso" ou "Empresa") está comprometida em proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
          <p className={styles.text}>
            Ao utilizar nossos serviços, site e aplicativos, você concorda com as práticas descritas nesta política. Recomendamos a leitura atenta deste documento.
          </p>
        </div>

        {/* Data Collected */}
        <div id="dados-coletados" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaDatabase />
            2. Dados Coletados
          </h2>
          <p className={styles.text}>
            Coletamos diferentes tipos de dados para fornecer e melhorar nossos serviços:
          </p>
          <p className={styles.text}><strong>Dados fornecidos por você:</strong></p>
          <ul className={styles.list}>
            <li>Nome completo e email (no cadastro da conta)</li>
            <li>Informações de pagamento (processadas pelo Mercado Pago)</li>
            <li>Mensagens enviadas ao suporte</li>
            <li>Feedbacks e avaliações de produtos</li>
          </ul>
          <p className={styles.text}><strong>Dados coletados automaticamente:</strong></p>
          <ul className={styles.list}>
            <li>Endereço IP e localização aproximada</li>
            <li>Tipo de navegador e sistema operacional</li>
            <li>Páginas visitadas e tempo de navegação</li>
            <li>Identificador de dispositivo (para validação de licenças)</li>
          </ul>
          <p className={styles.text}><strong>Dados que NÃO coletamos:</strong></p>
          <ul className={styles.list}>
            <li>Dados sensíveis (origem racial, convicções religiosas, dados de saúde)</li>
            <li>Números de cartão de crédito (processados apenas pelo Mercado Pago)</li>
            <li>Senhas em texto plano (armazenamos apenas hash criptografado)</li>
          </ul>
        </div>

        {/* Data Usage */}
        <div id="uso-dados" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaUserShield />
            3. Uso dos Dados
          </h2>
          <p className={styles.text}>
            Utilizamos seus dados pessoais para as seguintes finalidades:
          </p>
          <ul className={styles.list}>
            <li><strong>Prestação de serviços:</strong> Processar compras, entregar produtos e fornecer suporte</li>
            <li><strong>Comunicação:</strong> Enviar confirmações de compra, atualizações de produtos e responder dúvidas</li>
            <li><strong>Segurança:</strong> Validar licenças, prevenir fraudes e proteger nossos sistemas</li>
            <li><strong>Melhorias:</strong> Analisar o uso do site para melhorar a experiência do usuário</li>
            <li><strong>Obrigações legais:</strong> Cumprir exigências fiscais e regulatórias</li>
          </ul>
          <p className={styles.text}>
            <strong>Base legal (LGPD):</strong> O tratamento de dados é realizado com base no consentimento do titular, execução de contrato, cumprimento de obrigação legal e interesse legítimo do controlador.
          </p>
        </div>

        {/* Data Sharing */}
        <div id="compartilhamento" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaUserCog />
            4. Compartilhamento de Dados
          </h2>
          <p className={styles.text}>
            Seus dados pessoais podem ser compartilhados apenas nas seguintes situações:
          </p>
          <ul className={styles.list}>
            <li><strong>Mercado Pago:</strong> Para processamento de pagamentos (seguem sua própria política de privacidade)</li>
            <li><strong>Provedores de serviço:</strong> Hospedagem, email e análise de dados, sob contratos de confidencialidade</li>
            <li><strong>Exigência legal:</strong> Quando requerido por lei, ordem judicial ou autoridade competente</li>
            <li><strong>Proteção de direitos:</strong> Para proteger nossos direitos, propriedade ou segurança</li>
          </ul>
          <p className={styles.text}>
            <strong>Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.</strong>
          </p>
        </div>

        {/* Storage and Security */}
        <div id="armazenamento" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaLock />
            5. Armazenamento e Segurança
          </h2>
          <p className={styles.text}>
            Adotamos medidas técnicas e organizacionais para proteger seus dados:
          </p>
          <ul className={styles.list}>
            <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
            <li>Senhas armazenadas com hash bcrypt</li>
            <li>Acesso restrito a dados pessoais (apenas funcionários autorizados)</li>
            <li>Monitoramento e logs de segurança</li>
            <li>Backups regulares e redundância de dados</li>
          </ul>
          <p className={styles.text}>
            <strong>Período de retenção:</strong> Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas, ou conforme exigido por lei. Dados de conta são mantidos enquanto você for nosso cliente. Após solicitação de exclusão, seus dados serão removidos em até 30 dias, exceto quando houver obrigação legal de retenção.
          </p>
        </div>

        {/* Cookies */}
        <div id="cookies" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaCookieBite />
            6. Cookies e Tecnologias Similares
          </h2>
          <p className={styles.text}>
            Utilizamos cookies e tecnologias similares para:
          </p>
          <ul className={styles.list}>
            <li><strong>Cookies essenciais:</strong> Necessários para funcionamento do site (autenticação, carrinho)</li>
            <li><strong>Cookies de desempenho:</strong> Análise de uso e melhoria da experiência</li>
            <li><strong>Cookies de funcionalidade:</strong> Lembrar suas preferências</li>
          </ul>
          <p className={styles.text}>
            Você pode gerenciar cookies através das configurações do seu navegador. Desabilitar cookies essenciais pode afetar o funcionamento do site.
          </p>
        </div>

        {/* User Rights */}
        <div id="direitos" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaBalanceScale />
            7. Seus Direitos (LGPD)
          </h2>
          <p className={styles.text}>
            Conforme a Lei Geral de Proteção de Dados, você tem os seguintes direitos:
          </p>
          <ul className={styles.list}>
            <li><strong>Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
            <li><strong>Correção:</strong> Solicitar correção de dados incompletos ou desatualizados</li>
            <li><strong>Anonimização ou exclusão:</strong> Solicitar anonimização ou exclusão de dados desnecessários</li>
            <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
            <li><strong>Eliminação:</strong> Solicitar exclusão de dados tratados com base no consentimento</li>
            <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
            <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
            <li><strong>Oposição:</strong> Opor-se a tratamento em desacordo com a lei</li>
          </ul>
          <p className={styles.text}>
            Para exercer seus direitos, entre em contato conosco através dos canais indicados abaixo.
          </p>
        </div>

        {/* Contact */}
        <div id="contato" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaEnvelope />
            8. Contato do Encarregado (DPO)
          </h2>
          <p className={styles.text}>
            Para questões relacionadas à privacidade e proteção de dados, ou para exercer seus direitos como titular, entre em contato:
          </p>
          <ul className={styles.list}>
            <li><strong>Email:</strong> suporte@codecraftgenz.com.br</li>
            <li><strong>Assunto:</strong> "Solicitação LGPD - [seu nome]"</li>
          </ul>
          <p className={styles.text}>
            Responderemos sua solicitação em até 15 dias úteis, conforme previsto em lei.
          </p>
        </div>

        {/* Contact Section */}
        <div className={styles.contactSection}>
          <h3 className={styles.contactTitle}>Dúvidas sobre privacidade?</h3>
          <p className={styles.contactText}>
            Estamos à disposição para esclarecer qualquer questão.
          </p>
          <div className={styles.contactLinks}>
            <a
              href="mailto:suporte@codecraftgenz.com.br?subject=Solicitação LGPD"
              className={styles.contactLink}
            >
              <FaEnvelope />
              Contatar Encarregado (DPO)
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default PrivacyPolicyPage;
