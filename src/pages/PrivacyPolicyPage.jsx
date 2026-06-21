// src/pages/PrivacyPolicyPage.jsx
// Política de Privacidade - Conforme LGPD
import { Shield, ArrowLeft, Database, UserCheck, Lock, Cookie, Settings, Mail, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';

import styles from './LegalPage.module.css';

function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Shield />
            <span>Privacidade</span>
          </div>
          <h1 className={styles.heroTitle}>
            Política de <span className={styles.highlight}>Privacidade</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Saiba como coletamos, usamos e protegemos seus dados pessoais.
          </p>
          <p className={styles.lastUpdate}>
            Última atualização: Maio de 2026
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
            <Shield />
            1. Introdução
          </h2>
          <p className={styles.text}>
            A <span className={styles.highlight2}>CodeCraft GenZ</span> ("nós", "nosso" ou "Empresa") está comprometida em proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
          <p className={styles.text}>
            Ao utilizar nossos serviços, site e aplicativos, você concorda com as práticas descritas nesta política. Recomendamos a leitura atenta deste documento.
          </p>
          <p className={styles.text}>
            <strong>Controlador dos dados:</strong> CodeCraft GenZ — CNPJ 67.058.806/0001-01 — Ribeirão Preto, SP.
            Email: suporte@codecraftgenz.com.br. Fundada em outubro de 2025.
          </p>
        </div>

        {/* Data Collected */}
        <div id="dados-coletados" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <Database />
            2. Dados Coletados
          </h2>
          <p className={styles.text}>
            Coletamos diferentes tipos de dados para fornecer e melhorar nossos serviços:
          </p>
          <p className={styles.text}><strong>Dados fornecidos por você:</strong></p>
          <ul className={styles.list}>
            <li>Nome completo e email (no cadastro da conta)</li>
            <li>Informações de pagamento (processadas pela Asaas)</li>
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
            <li>Números de cartão de crédito (processados apenas pela Asaas)</li>
            <li>Senhas em texto plano (armazenamos apenas hash criptografado)</li>
          </ul>

          <p className={styles.text}><strong>Dados recebidos de provedores externos (OAuth):</strong></p>
          <p className={styles.text}>
            Quando você opta por se autenticar ou integrar sua conta usando provedores externos, recebemos do provedor — mediante sua autorização explícita — os seguintes dados:
          </p>
          <ul className={styles.list}>
            <li><strong>Login com Google (Google OAuth):</strong> nome, endereço de e-mail, foto de perfil (avatar) e identificador único da conta Google.</li>
            <li><strong>Vinculação com Discord (Discord OAuth):</strong> ID do usuário Discord, username, avatar, e tokens de acesso (accessToken e refreshToken) usados exclusivamente para sincronizar cargos e atividades dentro do nosso servidor Discord.</li>
          </ul>
          <p className={styles.text}>
            Esses dados são compartilhados pelos provedores apenas após sua autorização explícita na tela de consentimento OAuth. Os tokens do Discord são armazenados de forma protegida e usados somente para operações automatizadas no servidor da comunidade (ex.: atribuir cargos com base em pontuação). Você pode revogar essa autorização a qualquer momento desvinculando a conta no painel do usuário ou nas configurações do provedor (myaccount.google.com / discord.com/account).
          </p>
        </div>

        {/* Data Usage */}
        <div id="uso-dados" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <UserCheck />
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
            <Settings />
            4. Compartilhamento de Dados
          </h2>
          <p className={styles.text}>
            Seus dados pessoais podem ser compartilhados apenas nas seguintes situações:
          </p>
          <ul className={styles.list}>
            <li><strong>Asaas:</strong> Para processamento de pagamentos (seguem sua própria política de privacidade)</li>
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
            <Lock />
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
            <strong>Período de retenção:</strong> Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas, ou conforme exigido por lei. Dados de conta são mantidos enquanto você for nosso cliente. Após solicitação de exclusão, seus dados serão removidos em até 30 dias, exceto quando houver obrigação legal de retenção. Dados fiscais e de pagamento são mantidos por 5 anos conforme legislação tributária brasileira.
          </p>
        </div>

        {/* Cookies */}
        <div id="cookies" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <Cookie />
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
            <Scale />
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
            <Mail />
            8. Contato do Encarregado (DPO)
          </h2>
          <p className={styles.text}>
            Para questões relacionadas à privacidade e proteção de dados, ou para exercer seus direitos como titular, entre em contato:
          </p>
          <ul className={styles.list}>
            <li><strong>Encarregado (DPO):</strong> Ricardo Coradini de Marco Moretti</li>
            <li><strong>Email:</strong> suporte@codecraftgenz.com.br</li>
            <li><strong>Assunto:</strong> "Solicitação LGPD - [seu nome]"</li>
            <li><strong>WhatsApp:</strong> (35) 99935-8856</li>
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
              <Mail />
              Contatar Encarregado (DPO)
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PrivacyPolicyPage;
