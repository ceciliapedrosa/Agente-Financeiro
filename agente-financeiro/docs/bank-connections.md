# Piloto de conexões bancárias — Pluggy

Status: implementação sandbox, sem conexão com bancos reais, sem conciliação e sem movimentar dinheiro. O fluxo externo completo depende de credenciais e ainda precisa de homologação.

## Configuração pelo responsável pelo aplicativo

1. Criar uma conta de desenvolvimento no dashboard oficial https://dashboard.pluggy.ai e obter Client ID / Client Secret. Confirmar com o fornecedor que a conta está restrita ao sandbox e habilitar apenas os conectores fictícios para este piloto.
2. Na Vercel, cadastrar variáveis somente no servidor, preferencialmente em Preview para homologação:
   - SESSION_SECRET: manter segredo forte existente, mínimo 32 caracteres; o piloto recusa ativação sem ele.
   - PLUGGY_CLIENT_ID
   - PLUGGY_CLIENT_SECRET (sensitive)
   - BANK_CONNECTIONS_MODE=sandbox
   - BANK_SANDBOX_USER_IDS: IDs internos do DIZI das contas autorizadas, separados por vírgula.
3. Não usar prefixo NEXT_PUBLIC e não inserir segredos no GitHub ou no chat. Fazer novo deploy depois de configurar.
4. O build Vercel aplica scripts/bank-connections.sql de forma aditiva/idempotente, pelo mecanismo existente de preparação. Usar um banco isolado no Preview. Não compartilhar credenciais ou banco de produção com previews de código não confiável.
5. Login com conta liberada → Bancos → aceitar aviso de testes → conectar Pluggy Bank → user-ok / password-ok / MFA 123456 se solicitado → consultar dados → conferir período → desconectar.

## Dados e segurança

- Autenticação da sessão, verificação de Origin, lista de usuários piloto e modo sandbox exigidos no servidor.
- Client ID/Secret e API key nunca são enviados ao navegador. Connect token temporário fica apenas na memória do cliente; somente o hash fica no banco.
- Conclusão da conexão exige token emitido para aquele usuário e consulta ao Item com o token de escopo limitado. Somente então o item é associado à conta DIZI. IDs arbitrários enviados pelo cliente não concedem acesso.
- Conexões reais são rejeitadas pelo servidor e somente conectores marcados isSandbox são exibidos. O filtro do widget não substitui as restrições da conta Pluggy; configurar a conta do fornecedor para testes.
- Saldo/extrato fictícios são armazenados como snapshot validado, separado dos lançamentos financeiros. Conta mascarada, sem CPF, identidade, credenciais ou dados adicionais do provedor.
- Consulta manual ao cache do provedor, não atualização garantida em tempo real no banco. Timestamp da consulta e timestamp do provedor são distintos.
- Paginação por cursor v2; deduplicação por conta+ID. Limites de 20 contas, 20 páginas por conta e 10 mil movimentos. Uma falha preserva integralmente o snapshot anterior.
- Desconectar remove o item sandbox no provedor e os dados locais; erros não simulam sucesso. Tentativas abandonadas expiram após 30 min e não são mostradas.

## Antes de bancos reais

Contratação/cobertura do fornecedor; consentimento, termos e privacidade; retenção e exclusão; homologação OAuth mobile; monitoramento; webhooks autenticados e idempotentes; processamento incremental em jobs duráveis; renovação/revogação de consentimento; conciliação e tratamento de transferências/faturas. Não basta trocar uma variável: o servidor atualmente recusa conectores reais.

Fontes: https://docs.pluggy.ai/pt/docs/connect-widget/authentication ; https://docs.pluggy.ai/en/docs/connect-widget/environments ; https://docs.pluggy.ai/en/reference/transaction/transactions-list-by-cursor
