// src/pages/HelpPage.jsx
// Central de Ajuda - FAQ e Suporte
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaQuestionCircle,
  FaChevronDown,
  FaEnvelope,
  FaWhatsapp,
  FaShoppingCart,
  FaDownload,
  FaKey,
  FaUserCircle,
  FaCreditCard,
  FaShieldAlt,
  FaArrowLeft
} from 'react-icons/fa';
import Navbar from '../components/Navbar/Navbar';
import styles from './LegalPage.module.css';

const faqCategories = [
  {
    id: 'compras',
    title: 'Compras e Pagamentos',
    icon: FaShoppingCart,
    questions: [
      {
        question: 'Quais formas de pagamento são aceitas?',
        answer: 'Aceitamos pagamentos via Mercado Pago, que inclui cartão de crédito, débito, boleto bancário e Pix. Todas as transações são processadas de forma segura.'
      },
      {
        question: 'Como funciona o processo de compra?',
        answer: 'Ao clicar em "Comprar" em qualquer aplicativo, você será redirecionado para o Mercado Pago para concluir o pagamento. Após a aprovação, você receberá um email com o link para download e instruções de ativação.'
      },
      {
        question: 'Posso parcelar minhas compras?',
        answer: 'Sim! Através do Mercado Pago você pode parcelar suas compras em até 12x no cartão de crédito, sujeito a juros da operadora.'
      },
      {
        question: 'O pagamento é seguro?',
        answer: 'Absolutamente! Utilizamos o Mercado Pago como gateway de pagamento, que é uma das plataformas mais seguras do Brasil. Seus dados financeiros nunca são armazenados em nossos servidores.'
      }
    ]
  },
  {
    id: 'download',
    title: 'Download e Instalação',
    icon: FaDownload,
    questions: [
      {
        question: 'Como faço o download após a compra?',
        answer: 'Após a confirmação do pagamento, você receberá um email com o link para download. Você também pode acessar seus downloads através da página "Minha Conta" > "Meus Apps".'
      },
      {
        question: 'O download não está funcionando, o que fazer?',
        answer: 'Verifique sua conexão com a internet e tente novamente. Se o problema persistir, entre em contato conosco informando o email usado na compra e o nome do aplicativo.'
      },
      {
        question: 'Por quanto tempo tenho acesso ao download?',
        answer: 'Você tem acesso vitalício ao download do aplicativo. Pode baixar novamente quantas vezes precisar através da sua conta.'
      },
      {
        question: 'O antivírus está bloqueando o download/instalação',
        answer: 'Nossos aplicativos são seguros, mas alguns antivírus podem gerar falsos positivos. Adicione uma exceção temporária no seu antivírus durante a instalação. Se tiver dúvidas, entre em contato conosco.'
      }
    ]
  },
  {
    id: 'licenca',
    title: 'Licenças e Ativação',
    icon: FaKey,
    questions: [
      {
        question: 'Como ativo minha licença?',
        answer: 'Ao abrir o aplicativo pela primeira vez, informe o email usado na compra. O sistema verificará automaticamente sua licença e ativará o software no seu dispositivo.'
      },
      {
        question: 'Posso usar em mais de um computador?',
        answer: 'Cada licença permite ativação em 1 (um) dispositivo. Se precisar usar em outro computador, entre em contato conosco para verificar opções.'
      },
      {
        question: 'Troquei de computador, como transferir a licença?',
        answer: 'Entre em contato conosco informando o email da compra e explicando a situação. Podemos desativar a licença antiga e permitir uma nova ativação.'
      },
      {
        question: 'Minha licença expirou?',
        answer: 'Nossas licenças são vitalícias e não expiram. Se está tendo problemas de ativação, verifique se está usando o email correto da compra ou entre em contato conosco.'
      }
    ]
  },
  {
    id: 'conta',
    title: 'Minha Conta',
    icon: FaUserCircle,
    questions: [
      {
        question: 'Como criar uma conta?',
        answer: 'Clique em "Entrar" no menu superior e depois em "Criar conta". Preencha seus dados e confirme o email para ativar sua conta.'
      },
      {
        question: 'Esqueci minha senha, como recuperar?',
        answer: 'Na página de login, clique em "Esqueci minha senha". Informe seu email e você receberá instruções para criar uma nova senha.'
      },
      {
        question: 'Posso alterar meu email?',
        answer: 'Por segurança, alterações de email devem ser solicitadas através do nosso suporte, informando os dados da conta atual.'
      },
      {
        question: 'Como excluir minha conta?',
        answer: 'Para solicitar a exclusão da sua conta e dados, entre em contato conosco pelo email de suporte. O processo será concluído em até 30 dias.'
      }
    ]
  },
  {
    id: 'reembolso',
    title: 'Reembolso e Garantia',
    icon: FaCreditCard,
    questions: [
      {
        question: 'Qual a política de reembolso?',
        answer: 'Oferecemos garantia de 7 dias após a compra. Se o produto não atender suas expectativas, solicite o reembolso pelo email de suporte informando o motivo.'
      },
      {
        question: 'Como solicitar reembolso?',
        answer: 'Envie um email para suporte@codecraftgenz.com.br com o assunto "Solicitação de Reembolso", informando o email da compra, nome do aplicativo e motivo da solicitação.'
      },
      {
        question: 'Quanto tempo leva o reembolso?',
        answer: 'Após aprovação, o reembolso é processado em até 5 dias úteis. O prazo para aparecer na sua conta depende da forma de pagamento original.'
      }
    ]
  },
  {
    id: 'seguranca',
    title: 'Segurança e Privacidade',
    icon: FaShieldAlt,
    questions: [
      {
        question: 'Meus dados estão seguros?',
        answer: 'Sim! Seguimos as melhores práticas de segurança e estamos em conformidade com a LGPD. Seus dados são criptografados e nunca compartilhados com terceiros.'
      },
      {
        question: 'Quais dados são coletados?',
        answer: 'Coletamos apenas dados necessários para fornecer nossos serviços: email, nome e informações de pagamento (processadas pelo Mercado Pago). Veja nossa Política de Privacidade para mais detalhes.'
      },
      {
        question: 'Os aplicativos coletam dados?',
        answer: 'Nossos aplicativos coletam apenas informações técnicas necessárias para validação de licença (identificador do dispositivo). Não coletamos dados pessoais ou de uso.'
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqQuestion}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{question}</span>
        <FaChevronDown className={`${styles.faqIcon} ${isOpen ? styles.open : ''}`} />
      </button>
      {isOpen && (
        <div className={styles.faqAnswer}>
          {answer}
        </div>
      )}
    </div>
  );
}

function HelpPage() {
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
            <FaQuestionCircle />
            <span>Central de Ajuda</span>
          </div>
          <h1 className={styles.heroTitle}>
            Como podemos <span className={styles.highlight}>ajudar?</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Encontre respostas para as perguntas mais frequentes ou entre em contato conosco.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.contentSection}>
        {faqCategories.map((category) => (
          <div key={category.id} className={styles.card}>
            <h2 className={styles.sectionTitle}>
              <category.icon />
              {category.title}
            </h2>
            <div className={styles.faqSection}>
              {category.questions.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Contact Section */}
        <div className={styles.contactSection}>
          <h3 className={styles.contactTitle}>Não encontrou o que procurava?</h3>
          <p className={styles.contactText}>
            Nossa equipe está pronta para ajudar você com qualquer dúvida.
          </p>
          <div className={styles.contactLinks}>
            <a
              href="mailto:suporte@codecraftgenz.com.br"
              className={styles.contactLink}
            >
              <FaEnvelope />
              suporte@codecraftgenz.com.br
            </a>
            <a
              href="https://wa.me/5535999358856"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactLink}
            >
              <FaWhatsapp />
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HelpPage;
