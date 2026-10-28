# Segurança da versão personalizada (teste)

A base é o fork MIT de martin6727/couchframe, commit original `8e44547e807305ef6eff2b52efa69487c423f1d4`.

Medidas aplicadas no próprio código-fonte: remoção de AccessibilityService e respectivas permissões; nenhuma API `addJavascriptInterface`; comunicação AndroidX limitada à origem principal HTTPS `framextv.pro`; bloqueio de recursos HTTP e mixed content; proibição de acesso da WebView a arquivos e provedores de conteúdo locais; cookies de terceiros desabilitados; navegação principal limitada ao host exato; backup desabilitado; package ID próprio.

A compilação GitHub Actions gera um APK de **depuração/avaliação**, não uma versão oficial de produção. Não execute em ambientes com credenciais sensíveis e não contorne bloqueios do Play Protect.

**Riscos residuais:** código JavaScript e vídeos vêm da internet, e players em iframes podem não ser confiáveis; a segurança e legitimidade dos conteúdos não foram auditadas. As restrições podem reduzir compatibilidade da reprodução e do teclado em players externos. A confiança na cadeia de ferramentas do Android e nas GitHub Actions é necessária. **APK compilado não é certificado como seguro.**

O serviço original de atalho do botão Netflix foi removido, portanto não use instruções antigas de Acessibilidade encontradas no README upstream. Esta cópia não é afiliada ao FrameXTV.
