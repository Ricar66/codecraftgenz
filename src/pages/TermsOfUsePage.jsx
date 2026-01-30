// src/pages/TermsOfUsePage.jsx
// Termos de Uso do Site e Serviços
import { Link } from 'react-router-dom';
import {
  FaFileContract,
  FaArrowLeft,
  FaCheckCircle,
  FaUserCheck,
  FaShoppingBag,
  FaKey,
  FaBan,
  FaCopyright,
  FaGavel,
  FaEnvelope
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './LegalPage.module.css';

function TermsOfUsePage() {
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
            <FaFileContract />
            <span>Termos Legais</span>
          </div>
          <h1 className={styles.heroTitle}>
            Termos de <span className={styles.highlight}>Uso</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Leia atentamente os termos e condições de uso dos nossos serviços.
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
            <li><a href="#aceitacao">Aceitação dos Termos</a></li>
            <li><a href="#servicos">Descrição dos Serviços</a></li>
            <li><a href="#cadastro">Cadastro e Conta</a></li>
            <li><a href="#compras">Compras e Pagamentos</a></li>
            <li><a href="#licencas">Licenças de Uso</a></li>
            <li><a href="#proibicoes">Condutas Proibidas</a></li>
            <li><a href="#propriedade">Propriedade Intelectual</a></li>
            <li><a href="#responsabilidade">Limitação de Responsabilidade</a></li>
            <li><a href="#rescisao">Rescisão</a></li>
            <li><a href="#disposicoes">Disposições Gerais</a></li>
          </ol>
        </div>

        {/* Acceptance */}
        <div id="aceitacao" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaCheckCircle />
            1. Aceitação dos Termos
          </h2>
          <p className={styles.text}>
            Bem-vindo à <span className={styles.highlight2}>CodeCraft GenZ</span>. Ao acessar ou utilizar nosso site, serviços e aplicativos, você concorda em cumprir e estar vinculado a estes Termos de Uso.
          </p>
          <p className={styles.text}>
            Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços. Estes termos constituem um acordo legal entre você ("Usuário") e a CodeCraft GenZ ("Empresa", "nós" ou "nosso").
          </p>
          <p className={styles.text}>
            Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas por email ou notificação no site. O uso continuado após modificações implica aceitação dos novos termos.
          </p>
        </div>

        {/* Services */}
        <div id="servicos" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaShoppingBag />
            2. Descrição dos Serviços
          </h2>
          <p className={styles.text}>
            A CodeCraft GenZ é uma plataforma de venda de software e aplicativos digitais. Nossos serviços incluem:
          </p>
          <ul className={styles.list}>
            <li>Venda e distribuição de aplicativos de desktop desenvolvidos por nossa equipe</li>
            <li>Sistema de licenciamento para ativação e uso dos softwares</li>
            <li>Suporte técnico aos usuários de nossos produtos</li>
            <li>Atualizações e melhorias nos aplicativos adquiridos</li>
          </ul>
          <p className={styles.text}>
            Os serviços são fornecidos "como estão" e podem ser modificados, suspensos ou descontinuados a qualquer momento, mediante aviso prévio quando possível.
          </p>
        </div>

        {/* Registration */}
        <div id="cadastro" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaUserCheck />
            3. Cadastro e Conta
          </h2>
          <p className={styles.text}>
            Para utilizar certos recursos, você precisará criar uma conta. Ao se cadastrar, você concorda em:
          </p>
          <ul className={styles.list}>
            <li>Fornecer informações verdadeiras, precisas e completas</li>
            <li>Manter seus dados de cadastro atualizados</li>
            <li>Manter a confidencialidade de sua senha</li>
            <li>Ser responsável por todas as atividades em sua conta</li>
            <li>Notificar imediatamente sobre uso não autorizado</li>
          </ul>
          <p className={styles.text}>
            Você deve ter pelo menos 18 anos para criar uma conta. Menores de 18 anos podem usar os serviços apenas com supervisão e consentimento dos responsáveis legais.
          </p>
          <p className={styles.text}>
            Reservamos o direito de suspender ou encerrar contas que violem estes termos ou apresentem atividade suspeita.
          </p>
        </div>

        {/* Purchases */}
        <div id="compras" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaShoppingBag />
            4. Compras e Pagamentos
          </h2>
          <p className={styles.text}>
            <strong>4.1. Preços e Pagamento</strong>
          </p>
          <ul className={styles.list}>
            <li>Todos os preços são em Reais (BRL) e incluem impostos aplicáveis</li>
            <li>Pagamentos são processados pelo Mercado Pago, sujeitos aos seus termos</li>
            <li>A compra é confirmada após aprovação do pagamento</li>
            <li>Reservamos o direito de alterar preços a qualquer momento</li>
          </ul>
          <p className={styles.text}>
            <strong>4.2. Entrega Digital</strong>
          </p>
          <ul className={styles.list}>
            <li>Produtos são entregues digitalmente após confirmação do pagamento</li>
            <li>Links de download são enviados por email e disponíveis na conta</li>
            <li>Você tem acesso permanente ao download enquanto o produto existir</li>
          </ul>
          <p className={styles.text}>
            <strong>4.3. Reembolso</strong>
          </p>
          <ul className={styles.list}>
            <li>Oferecemos garantia de 7 dias para reembolso integral</li>
            <li>Solicitações devem ser feitas por email com justificativa</li>
            <li>Reembolsos são processados em até 5 dias úteis após aprovação</li>
            <li>Não há reembolso após 7 dias da compra, exceto em casos excepcionais</li>
          </ul>
        </div>

        {/* Licenses */}
        <div id="licencas" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaKey />
            5. Licenças de Uso
          </h2>
          <p className={styles.text}>
            <strong>5.1. Concessão de Licença</strong>
          </p>
          <p className={styles.text}>
            Ao adquirir um software, você recebe uma licença não exclusiva, intransferível e revogável para uso pessoal do aplicativo, sujeita a estes termos.
          </p>
          <p className={styles.text}>
            <strong>5.2. Restrições da Licença</strong>
          </p>
          <ul className={styles.list}>
            <li>A licença é válida para 1 (um) dispositivo por compra</li>
            <li>Não é permitido revender, sublicenciar ou transferir a licença</li>
            <li>Não é permitido modificar, descompilar ou fazer engenharia reversa</li>
            <li>Não é permitido remover avisos de direitos autorais ou marcas</li>
            <li>Não é permitido usar para fins ilegais ou não autorizados</li>
          </ul>
          <p className={styles.text}>
            <strong>5.3. Ativação</strong>
          </p>
          <p className={styles.text}>
            Nossos softwares requerem ativação online vinculada ao email de compra e identificador do dispositivo. A ativação pode ser revogada em caso de violação destes termos.
          </p>
        </div>

        {/* Prohibited Conduct */}
        <div id="proibicoes" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaBan />
            6. Condutas Proibidas
          </h2>
          <p className={styles.text}>
            Ao usar nossos serviços, você concorda em NÃO:
          </p>
          <ul className={styles.list}>
            <li>Violar leis, regulamentos ou direitos de terceiros</li>
            <li>Distribuir, compartilhar ou piratear nossos softwares</li>
            <li>Tentar burlar sistemas de licenciamento ou proteção</li>
            <li>Usar bots, scrapers ou métodos automatizados no site</li>
            <li>Transmitir vírus, malware ou código malicioso</li>
            <li>Interferir no funcionamento de nossos sistemas</li>
            <li>Criar contas falsas ou usar identidades fraudulentas</li>
            <li>Realizar chargebacks fraudulentos</li>
            <li>Assediar, ameaçar ou difamar outros usuários ou nossa equipe</li>
          </ul>
          <p className={styles.text}>
            Violações podem resultar em suspensão imediata da conta, revogação de licenças e medidas legais cabíveis.
          </p>
        </div>

        {/* Intellectual Property */}
        <div id="propriedade" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaCopyright />
            7. Propriedade Intelectual
          </h2>
          <p className={styles.text}>
            Todo o conteúdo, incluindo mas não limitado a softwares, código-fonte, design, textos, gráficos, logos, ícones e imagens, é propriedade exclusiva da CodeCraft GenZ ou de seus licenciadores, protegido por leis de direitos autorais e propriedade intelectual.
          </p>
          <p className={styles.text}>
            A compra de um software não transfere nenhum direito de propriedade intelectual. Você recebe apenas uma licença de uso conforme descrito nestes termos.
          </p>
          <p className={styles.text}>
            É expressamente proibido copiar, reproduzir, distribuir ou criar obras derivadas de nosso conteúdo sem autorização prévia por escrito.
          </p>
        </div>

        {/* Liability */}
        <div id="responsabilidade" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaGavel />
            8. Limitação de Responsabilidade
          </h2>
          <p className={styles.text}>
            <strong>8.1. Isenção de Garantias</strong>
          </p>
          <p className={styles.text}>
            Nossos serviços são fornecidos "como estão" e "conforme disponíveis", sem garantias de qualquer tipo, expressas ou implícitas, incluindo garantias de comercialização ou adequação a um propósito específico.
          </p>
          <p className={styles.text}>
            <strong>8.2. Limitação de Danos</strong>
          </p>
          <p className={styles.text}>
            Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais ou consequenciais, incluindo perda de lucros, dados ou uso, resultantes do uso ou incapacidade de uso de nossos serviços.
          </p>
          <p className={styles.text}>
            Nossa responsabilidade total não excederá o valor pago pelo produto ou serviço que deu origem à reclamação.
          </p>
          <p className={styles.text}>
            <strong>8.3. Indemnização</strong>
          </p>
          <p className={styles.text}>
            Você concorda em indenizar e isentar a CodeCraft GenZ de quaisquer reclamações, danos ou despesas decorrentes de sua violação destes termos ou uso indevido dos serviços.
          </p>
        </div>

        {/* Termination */}
        <div id="rescisao" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaBan />
            9. Rescisão
          </h2>
          <p className={styles.text}>
            <strong>9.1. Por parte do Usuário</strong>
          </p>
          <p className={styles.text}>
            Você pode encerrar sua conta a qualquer momento através das configurações da conta ou solicitando ao suporte. O encerramento não dá direito a reembolso de compras anteriores.
          </p>
          <p className={styles.text}>
            <strong>9.2. Por parte da Empresa</strong>
          </p>
          <p className={styles.text}>
            Podemos suspender ou encerrar sua conta e acesso aos serviços, a nosso critério, por violação destes termos, atividade fraudulenta ou comportamento prejudicial. Em casos graves, a suspensão pode ser imediata e sem aviso prévio.
          </p>
          <p className={styles.text}>
            <strong>9.3. Efeitos da Rescisão</strong>
          </p>
          <p className={styles.text}>
            Após rescisão, todas as licenças concedidas serão revogadas. Disposições que por sua natureza devem sobreviver à rescisão permanecerão em vigor (propriedade intelectual, limitação de responsabilidade, etc.).
          </p>
        </div>

        {/* General Provisions */}
        <div id="disposicoes" className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <FaFileContract />
            10. Disposições Gerais
          </h2>
          <p className={styles.text}>
            <strong>10.1. Lei Aplicável</strong>
          </p>
          <p className={styles.text}>
            Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida ao foro da comarca de São Paulo/SP, com exclusão de qualquer outro.
          </p>
          <p className={styles.text}>
            <strong>10.2. Acordo Integral</strong>
          </p>
          <p className={styles.text}>
            Estes Termos de Uso, juntamente com nossa Política de Privacidade, constituem o acordo integral entre você e a CodeCraft GenZ.
          </p>
          <p className={styles.text}>
            <strong>10.3. Divisibilidade</strong>
          </p>
          <p className={styles.text}>
            Se qualquer disposição for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.
          </p>
          <p className={styles.text}>
            <strong>10.4. Renúncia</strong>
          </p>
          <p className={styles.text}>
            A falha em exercer qualquer direito ou disposição não constitui renúncia ao mesmo.
          </p>
        </div>

        {/* Contact Section */}
        <div className={styles.contactSection}>
          <h3 className={styles.contactTitle}>Dúvidas sobre os termos?</h3>
          <p className={styles.contactText}>
            Entre em contato conosco para esclarecimentos.
          </p>
          <div className={styles.contactLinks}>
            <a
              href="mailto:suporte@codecraftgenz.com.br?subject=Dúvida sobre Termos de Uso"
              className={styles.contactLink}
            >
              <FaEnvelope />
              Contatar Suporte
            </a>
            <Link to="/ajuda" className={styles.contactLink}>
              Central de Ajuda
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default TermsOfUsePage;
