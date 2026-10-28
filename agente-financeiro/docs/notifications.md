# Lembretes DIZI

## Comportamento

Página `/notificacoes`, acessível pelo sino no cabeçalho mobile e pelo menu desktop. Usuários escolhem pagamentos nos próximos 3 dias, vencendo hoje, atrasados (inclui saldo parcial) e receitas previstas até hoje. Receitas são opt-in. Contas pagas/canceladas e receitas recebidas/canceladas não geram aviso. Valores usam as mesmas regras de saldo do aplicativo; datas de vencimento são datas civis armazenadas em UTC e o dia atual é calculado no horário de Brasília.

Resumo diário, somente quando há pendências. Push genérico, sem detalhes financeiros na tela bloqueada. E-mail contém contagens e links para o aplicativo, sem nomes nem valores. Cada aparelho exige permissão explícita. O endereço cadastrado precisa de confirmação por link, com sessão do titular, antes de receber resumos. É possível desligar cada canal. Nenhum usuário é inscrito automaticamente.

## Configuração em produção

No projeto Vercel `agente-financeiro`, configurar **somente no ambiente Production**, sem publicar segredos no código:

- `APP_URL=https://agente-financeiro-woad.vercel.app`
- `SESSION_SECRET`: manter a chave de sessão existente, com pelo menos 32 caracteres. Uma troca invalida sessões antigas.
- `CRON_SECRET`: segredo aleatório de pelo menos 32 caracteres. A Vercel o envia no Authorization Bearer do cron.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: par gerado uma única vez com `web-push.generateVAPIDKeys()`. A chave privada permanece exclusivamente no servidor. Evitar rotação, pois invalida inscrições existentes.
- `VAPID_SUBJECT`: URL HTTPS de contato ou `mailto:` real do responsável.
- `RESEND_API_KEY`, `EMAIL_FROM`: reutilizam o serviço já previsto na recuperação de senha. Usar remetente/domínio verificado no Resend e conferir restrições de sandbox do provedor.

Fazer novo deploy após configurar. Os controles indicam indisponibilidade enquanto faltarem variáveis. A presença das variáveis não garante que os provedores estejam funcionando: validar uma conta/aparelho consentidos antes de anunciar o serviço ativo.

`vercel.json` agenda `/api/cron/notifications` diariamente às 12h UTC (9h de Brasília). No plano Hobby a execução pode ocorrer dentro daquela hora, sem minuto exato. A página comunica 9h–10h e possíveis atrasos de entrega. Não há escolha individual de horário nesta versão.

## Validação de entrega

1. Abrir `/notificacoes`, salvar tipos de aviso e ativar em um aparelho real. iOS/iPadOS 16.4+ exige abrir o app instalado na Tela de Início.
2. Pedir confirmação por e-mail, seguir o link e confirmar. Não é ativado por apenas abrir o link (evita scanners de e-mail).
3. Usar uma conta de teste com um pagamento pendente vencendo hoje, e outro pago/cancelado para conferir exclusão.
4. Aguardar a execução agendada; verificar recebimento real nos dois canais e abrir a notificação até o app. Não basta aceitação HTTP do provedor.
5. Conferir o histórico resumido na página e logs do cron. Reexecutar o mesmo job não deve gerar duplicações do mesmo canal/destinatário/dia.
6. Desativar os canais e verificar que a execução seguinte não envia. Validar permissão negada, aparelho sem suporte e assinatura expirada.

## Operação e limites

- Migração SQL aditiva e idempotente no build da Vercel, sem reset. Testada com PGlite.
- Registro único por usuário/canal/destino/dia é adquirido antes do envio. Concorrência e reexecução não duplicam avisos. Falha ambígua não é reintentada no mesmo dia para evitar push duplicado. O resumo seguinte pode tentar novamente; entrega não é garantida. `SENT` significa aceitação pelo serviço, não leitura/entrega no dispositivo.
- E-mail também utiliza chave de idempotência Resend. Confirmações têm intervalo mínimo de 10 minutos e expiração de 1 hora.
- Subscrições de outro usuário não podem ser assumidas. Limite de cinco aparelhos por conta. Endpoints de push HTTPS permitidos: Google FCM, Apple, Mozilla e Windows WNS. Novos serviços precisam de revisão da lista para não abrir SSRF.
- Push 404/410 remove inscrição expirada. Nenhuma página autenticada é armazenada em cache pelo service worker.
- Cron paginado em grupos de 25, execução máxima de 300 segundos, orçamento de 240 segundos. HTTP 503 sinaliza execução incompleta e permite reexecutar sem duplicar alvos já adquiridos. A Vercel não garante retry automático: monitorar e, conforme crescimento, migrar para fila durável por usuário.
- Histórico técnico retido por 90 dias. Não contém conteúdo das mensagens nem tokens. Página mostra última tentativa do usuário. Segredos/respostas brutas de provedores não são registrados em logs.
- Avisos refletem cadastros no momento da consulta. Uma alteração simultânea ao envio pode aparecer no resumo em trânsito. Desativação é conferida novamente antes do envio, mas não recolhe mensagens já aceitas pelo provedor.
- Testes automatizados usam provedores simulados; não enviam notificações reais nem e-mails.

Referências: https://vercel.com/docs/cron-jobs/usage-and-pricing ; https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ ; https://github.com/web-push-libs/web-push ; https://resend.com/docs/api-reference/emails/send-email
