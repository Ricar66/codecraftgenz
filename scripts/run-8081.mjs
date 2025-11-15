// Executa o servidor definindo PORT=8081 sem depender da sintaxe do PowerShell
process.env.PORT = process.env.PORT || '8081';
import '../server.js';