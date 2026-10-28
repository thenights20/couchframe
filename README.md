# FrameXTV para TV — Português do Brasil

Aplicativo **não oficial** para Google TV e Android TV, baseado no projeto CouchFrame (licença MIT) de [martin6727](https://github.com/martin6727/couchframe).

## Baixar e instalar

Acesse **[a versão mais recente](../../releases/latest)** e, em **Assets**, baixe **`FrameXTV-para-TV-pt-BR.apk`** diretamente (não é necessário descompactar ZIP). Instale na TV com um instalador de APK, como Downloader ou um gerenciador de arquivos.

## Português do Brasil

- Nome do aplicativo, mensagens de erro e aviso de saída em português (Brasil).
- Preferência `pt-BR` nas solicitações iniciais do navegador.
- Tradução pontual de menus e botões comuns do site, quando seus textos forem reconhecidos.
- **O site `framextv.pro` é externo** e não controlamos todo o idioma dele. Alguns textos, filmes ou players podem continuar em inglês. Não há tradução automática completa.

## Preferências automáticas de reprodução (versão 1.2)

- Mantém a abertura em tela cheia já existente, quando o player é reconhecido.
- Prioriza a maior qualidade disponível **se o player expõe uma lista selecionável ou API HLS compatível**; não é possível forçar um servidor externo a transmitir 4K.
- Se houver faixas de áudio reconhecíveis, tenta selecionar português (Brasil), seguido de português sem região especificada.
- Quando o áudio português não está disponível ou não é identificável, tenta ativar legendas em português, se o player expõe essas faixas.
- No início da reprodução, apresenta por **10 segundos** um painel sobre o vídeo com a **resolução decodificada detectada**, áudio atual, idioma original e legendas identificáveis; informações não expostas pelo player aparecem como "Não informado" ou "Não identificadas".
- Alguns iframes, players personalizados ou vídeos protegidos não oferecem APIs para selecionar ou descobrir áudio, legendas e resolução. Nesses casos, não há garantia de ajuste automático.
- O painel não informa que há dublagem se não houver dados confiáveis sobre a faixa de áudio.

## Segurança e compatibilidade

O APK é uma **versão de teste**, sem o serviço de Acessibilidade. A WebView bloqueia acesso a arquivos locais, cookies de terceiros, pop-ups, HTTP e mixed content, e restringe a navegação principal ao domínio `framextv.pro`. Isso reduz riscos, mas não garante segurança ou compatibilidade com todos os players.

O APK é compilado sem depuração, mas é assinado com uma chave de teste que pode ser diferente em cada compilação. Pode ser necessário desinstalar a versão anterior antes de instalar outra (o que apaga dados do app). Nunca desative o Play Protect para prosseguir.

## Navegação

O controle remoto faz a navegação com as setas, OK e VOLTAR; os controles do player dependem da versão atual do site.

## Créditos

Base do CouchFrame: [martin6727/couchframe](https://github.com/martin6727/couchframe). Mantemos a licença MIT e os avisos de direitos autorais em [LICENSE](LICENSE). Não somos afiliados ao FrameXTV.

Veja [SECURITY.md](SECURITY.md) para as limitações de segurança.
