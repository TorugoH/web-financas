# Simulacoes trabalhistas

## Escopo

- Salario liquido CLT, ferias gozadas e rescisao de contrato por prazo indeterminado.
- Sem justa causa, pedido de demissao, acordo do art. 484-A e justa causa.
- Competencias de janeiro a dezembro de 2026. Outro ano exige revisar o motor e as fontes; nao reutilizar tabelas silenciosamente.
- A simulacao de investimentos existente foi preservada, com limite de 600 meses.
- Nenhuma alteracao de autenticacao e nenhum salvamento de lancamentos pelos simuladores.

## Consulta automatica

O frontend chama `GET /simulacoes/tabelas?ano=2026` com a autenticacao existente.
O backend consulta apenas duas URLs HTTPS fixas, do INSS e da Receita Federal.
Nenhum salario, documento ou outro dado do usuario e enviado a essas fontes.
Nao ha integracao com modelo de IA, chave externa ou custo de API de IA.

O Jsoup interpreta as tabelas HTML. Sao validados competencia, estrutura das tabelas,
ordem das faixas, aliquotas e a formula de reducao de 2026. Uma mudanca no texto da
lei/formula exige revisao, nao e convertida automaticamente em codigo.

- Cache em memoria por seis horas por instancia do backend.
- Timeout de cinco segundos e limite de 2 MB por pagina, sem seguir redirecionamentos.
- Falha posterior: ultima tabela validada, com status DESATUALIZADA e data original.
- Falha na primeira consulta: snapshot revisado de 2026, status CONTINGENCIA, sem inventar data de consulta.
- Nova tentativa apos cinco minutos em caso de falha. A tela mostra fonte e status.
- Backend indisponivel: calculos trabalhistas indisponiveis; investimentos continuam funcionando.

## Premissas de calculo

INSS progressivo por faixas, com teto e arredondamento final em centavos.
IRRF usa a maior deducao entre INSS mais dependentes e desconto simplificado, nunca ambos.
O redutor de 2026 usa o rendimento tributavel bruto, nao a base apos deducoes.
Saldo salarial e decimo terceiro sao tributados separadamente na rescisao.

Vale-transporte inicia em 6%, editavel de 0 a 6%, aplicado ao salario base e limitado
ao custo do beneficio quando informado. Outros descontos nao reduzem a base tributavel.

Ferias: dias de gozo mais um terco, sem abono pecuniario. O adiantamento de 50% do
13o e separado e nao sofre desconto no recibo. INSS isolado e uma estimativa: a folha
real pode ajustar por competencia, outras verbas e ferias atravessando meses.

Rescisao: avos de 13o e ferias sao informados pelo usuario, ja incluindo a projecao
do aviso; NAO sao deduzidos automaticamente de datas de admissao/desligamento.
Aviso indenizado e de 30 dias mais 3 por ano completo, limitado a 90; no acordo,
a indenizacao e reduzida pela metade. Aviso trabalhado ja integra o saldo informado.
No pedido, o desconto de aviso nao cumprido e limitado a 30 dias neste modelo.
Ferias em dobro e simples devem ser periodos distintos. Indenizacoes de aviso e ferias
nao compoem as bases de INSS/IRRF. Justa causa segue a regra geral da CLT, sem
proporcionais, ressalvados direitos judiciais/coletivos que o simulador nao avalia.

Multa FGTS de 40% ou 20% sobre o saldo para fins rescisorios informado, mostrada
separadamente, sem somar saldo de FGTS, saques ou depositos pendentes ao liquido.
Nao inclui convencoes coletivas, pensao judicial, multiplos vinculos, abono de ferias,
ajustes anuais de IR ou um calculo completo de folha/eSocial. Estimativa para planejamento.

## Fontes oficiais

- [INSS: tabela mensal](https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal)
- [Receita: tributacao de 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026)
- [Receita: exemplos do redutor](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025)
- [CLT, arts. 143, 146, 147, 484-A e 487](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm)
- [Aviso proporcional: Lei 12.506](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12506.htm)
- [eSocial: desconto simplificado tambem em ferias e 13o](https://www.gov.br/esocial/pt-br/empresas/perguntas-frequentes/perguntas-frequentes-producao-empresas-e-ambiente-de-testes)
- [PGFN: ferias indenizadas](https://www.gov.br/pgfn/pt-br/cidadania-tributaria/por-assunto/imposto-de-renda-pessoa-fisica-irpf-2/copy_of_conceito-de-rendimentos-e-verbas-nao-tributaveis/ferias)

## Verificacao

Frontend: `npm run build` e `npm run test:simulacoes` (Chrome instalado).
O script direcionado inclui os testes de recorrencia e nao depende do teste antigo
do AppComponent, que ainda referencia um campo title inexistente.

Backend (Java 25):

```powershell
.\mvnw.cmd '-Dtest=TabelasTrabalhistasServiceTest,RecorrenciaServiceTest' test
.\mvnw.cmd '-Dtest=TabelasTrabalhistasServiceTest' '-Dtabelas.live=true' test
```

O segundo comando acessa as fontes reais; sem a propriedade, o teste de rede e ignorado.
Reinicie/republique o backend junto com o frontend para disponibilizar o novo endpoint.
