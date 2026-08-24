import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function NotificacaoPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(!!id);

  // Formulário State
  const [numeroNotificacao, setNumeroNotificacao] = useState("");
  const [nomeNotificado, setNomeNotificado] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [dataIdentificacao, setDataIdentificacao] = useState("");

  const [endereco, setEndereco] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");

  const [protocolo, setProtocolo] = useState("");
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState(Array(5).fill(""));

  const [orientacaoRisco, setOrientacaoRisco] = useState(false);
  const [orientacaoOutros, setOrientacaoOutros] = useState(false);
  const [orientacaoOutrosTexto, setOrientacaoOutrosTexto] = useState("");
  const [descricaoOrientacao, setDescricaoOrientacao] = useState(Array(4).fill(""));
  const [prazoData, setPrazoData] = useState("");

  const [emissorNome, setEmissorNome] = useState("");
  const [emissorCargo, setEmissorCargo] = useState("");
  const [emissorMatricula, setEmissorMatricula] = useState("");

  const [recebimentoDataHora, setRecebimentoDataHora] = useState("");
  const [recebimentoNome, setRecebimentoNome] = useState("");
  const [recebimentoCargo, setRecebimentoCargo] = useState("");
  const [recebimentoDocumento, setRecebimentoDocumento] = useState("");

  useEffect(() => {
    if (id) {
      supabase
        .from("ocorrencias")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {
          setLoading(false);
          if (data && !error) {
            setProtocolo(data.protocolo || "");
            const today = new Date();
            setDataIdentificacao(today.toLocaleDateString("pt-BR"));

            const fullEndereco = [data.logradouro, data.numero, data.bairro]
              .filter(Boolean)
              .join(", ");
            setEndereco(fullEndereco);
            setPontoReferencia(data.ponto_referencia || "");
            setContato(data.telefone || "");
            setNomeNotificado(data.nome_solicitante || "");
            setCpfCnpj((data as any).cpf || "");
          }
        });
    } else {
      const today = new Date();
      setDataIdentificacao(today.toLocaleDateString("pt-BR"));
    }
  }, [id]);

  const updateDescricao = (index: number, value: string, isOcorrencia: boolean) => {
    if (isOcorrencia) {
      const newArr = [...descricaoOcorrencia];
      newArr[index] = value;
      setDescricaoOcorrencia(newArr);
    } else {
      const newArr = [...descricaoOrientacao];
      newArr[index] = value;
      setDescricaoOrientacao(newArr);
    }
  };

  const InputField = ({ label, value, onChange, className = "" }: any) => (
    <div className={`flex flex-col ${className}`}>
      <span className="text-[10px] font-bold uppercase mb-0.5">{label}</span>
      <input
        type="text"
        className="border-b border-black outline-none bg-transparent text-sm pb-1 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white flex flex-col items-center py-8 print:py-0">
      
      {/* Barra de Ações (Escondida na impressão) */}
      <div className="w-full max-w-[210mm] bg-white rounded-xl shadow p-4 mb-6 flex items-center justify-between print:hidden">
        <div>
          <h2 className="font-bold text-lg">Pré-visualização da Notificação</h2>
          <p className="text-sm text-muted-foreground">Preencha os campos abaixo e clique em Imprimir.</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
          <Printer className="w-4 h-4" /> Imprimir Documento
        </Button>
      </div>

      {/* Página A4 Simulada */}
      <div className="w-[210mm] min-h-[297mm] bg-white print:shadow-none shadow-xl border border-gray-300 print:border-none px-12 py-10 flex flex-col font-sans text-black relative">
        
        {/* Cabeçalho */}
        <div className="flex items-start justify-between relative mb-2">
          {/* Logo / Brasão Area */}
          <div className="flex flex-col items-center w-32">
            <div className="w-16 h-16 bg-gray-200 border border-gray-400 rounded flex items-center justify-center text-[10px] text-gray-500 text-center leading-tight print:border-transparent print:bg-transparent overflow-hidden">
              <span className="print:hidden">[Brasão]</span>
            </div>
            <span className="text-[11px] font-bold mt-1 text-center leading-tight">Defesa Civil</span>
          </div>

          <div className="flex-1 text-center pt-2">
            <h1 className="text-xl font-black uppercase tracking-wide">DEFESA CIVIL</h1>
            <p className="text-xs mt-1">Telefone: (51) 3289.0199 - defesacivil@portoalegre.rs.gov.br</p>
            <h2 className="text-3xl font-black mt-6 tracking-widest">NOTIFICAÇÃO</h2>
          </div>

          {/* Num da Notificação */}
          <div className="w-40 border border-black rounded-lg p-2 flex flex-col items-center -mt-2">
            <span className="text-[9px] font-bold">NÚMERO DA NOTIFICAÇÃO</span>
            <input 
              type="text" 
              className="w-full text-center outline-none mt-1 text-lg font-bold" 
              value={numeroNotificacao}
              onChange={e => setNumeroNotificacao(e.target.value)}
            />
          </div>
        </div>

        {/* 1. IDENTIFICAÇÃO DO NOTIFICADO */}
        <fieldset className="border border-black rounded-xl pt-4 pb-3 px-4 relative mt-8">
          <legend className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-xs font-bold font-sans tracking-wide whitespace-nowrap">
            IDENTIFICAÇÃO DO NOTIFICADO
          </legend>
          <div className="space-y-4 pt-1">
            <InputField label="NOME OU DENOMINAÇÃO SOCIAL" value={nomeNotificado} onChange={setNomeNotificado} />
            <div className="grid grid-cols-4 gap-4">
              <InputField label="CPF/CNPJ" value={cpfCnpj} onChange={setCpfCnpj} className="col-span-1" />
              <InputField label="CONTATO" value={contato} onChange={setContato} className="col-span-2" />
              <InputField label="DATA" value={dataIdentificacao} onChange={setDataIdentificacao} className="col-span-1" />
            </div>
          </div>
        </fieldset>

        {/* 2. LOCAL DA OCORRÊNCIA */}
        <fieldset className="border border-black rounded-xl pt-4 pb-3 px-4 relative mt-6">
          <legend className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-xs font-bold font-sans tracking-wide whitespace-nowrap">
            LOCAL DA OCORRÊNCIA
          </legend>
          <div className="space-y-4 pt-1">
            <InputField label="ENDEREÇO" value={endereco} onChange={setEndereco} />
            <InputField label="PONTO DE REFERÊNCIA" value={pontoReferencia} onChange={setPontoReferencia} />
          </div>
        </fieldset>

        {/* 3. OCORRÊNCIA */}
        <fieldset className="border border-black rounded-xl pt-4 pb-4 px-4 relative mt-8">
          <legend className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-xs font-bold font-sans tracking-wide whitespace-nowrap">
            OCORRÊNCIA
          </legend>
          <div className="flex items-start gap-4 mb-2">
            <div className="border border-black rounded-lg p-2 w-48 relative -top-3 mt-1">
              <span className="text-[10px] font-bold block bg-white px-1 absolute -top-2 left-2">PROTOCOLO 156</span>
              <input 
                type="text" 
                className="w-full text-center outline-none font-bold mt-0 text-sm" 
                value={protocolo}
                onChange={e => setProtocolo(e.target.value)}
              />
            </div>
            <div className="flex-1 mt-1">
              <input type="text" className="border-b border-black outline-none w-full pb-1 text-sm bg-transparent" 
                value={descricaoOcorrencia[0]} onChange={(e) => updateDescricao(0, e.target.value, true)} />
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(idx => (
              <input key={`oco-${idx}`} type="text" className="border-b border-black outline-none w-full pb-1 text-sm bg-transparent" 
                value={descricaoOcorrencia[idx]} onChange={(e) => updateDescricao(idx, e.target.value, true)} />
            ))}
          </div>
        </fieldset>

        {/* 4. ORIENTAÇÃO */}
        <fieldset className="border border-black rounded-xl pt-4 pb-4 px-4 relative mt-8">
          <legend className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-xs font-bold font-sans tracking-wide whitespace-nowrap">
            ORIENTAÇÃO
          </legend>
          <div className="flex items-center gap-10 mb-4 px-2 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-6 h-6 border ${orientacaoRisco ? 'border-black print:bg-black print:text-white bg-black text-white flex items-center justify-center font-bold text-lg' : 'border-black bg-transparent'}`} onClick={() => setOrientacaoRisco(!orientacaoRisco)}>
                {orientacaoRisco ? 'X' : ''}
              </div>
              <span className="font-bold text-sm tracking-wide">ELIMINAÇÃO DO RISCO</span>
            </label>
            <div className="flex items-center gap-3 flex-1 pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-6 h-6 border shrink-0 ${orientacaoOutros ? 'border-black print:bg-black print:text-white bg-black text-white flex items-center justify-center font-bold text-lg' : 'border-black bg-transparent'}`} onClick={() => setOrientacaoOutros(!orientacaoOutros)}>
                  {orientacaoOutros ? 'X' : ''}
                </div>
                <span className="font-bold text-sm tracking-wide">OUTROS</span>
              </label>
              <input 
                type="text" 
                className="border-b border-black outline-none w-full pb-1 text-sm bg-transparent" 
                value={orientacaoOutrosTexto}
                onChange={e => setOrientacaoOutrosTexto(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 mb-4 mt-2">
            {[0, 1, 2].map(idx => (
              <input key={`ori-${idx}`} type="text" className="border-b border-black outline-none w-full pb-1 text-sm bg-transparent" 
                value={descricaoOrientacao[idx]} onChange={(e) => updateDescricao(idx, e.target.value, false)} />
            ))}
          </div>
          
          <div className="flex items-end gap-2 mt-4">
            <input type="text" className="border-b border-black outline-none w-full pb-1 text-sm bg-transparent flex-1" 
                value={descricaoOrientacao[3]} onChange={(e) => updateDescricao(3, e.target.value, false)} />
            <div className="flex flex-col w-56 pl-4 border-b border-black pb-1 relative -top-1">
              <span className="text-[10px] font-bold absolute -top-5 right-2">PRAZO ATÉ O DIA</span>
              <div className="flex justify-center font-bold text-sm">
                ___ / ___ / ______
              </div>
            </div>
          </div>
        </fieldset>

        {/* 5. EMISSOR DA NOTIFICAÇÃO */}
        <fieldset className="border border-black rounded-xl pt-4 pb-4 px-4 relative mt-8">
          <legend className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-xs font-bold font-sans tracking-wide whitespace-nowrap">
            EMISSOR DA NOTIFICAÇÃO
          </legend>
          <div className="space-y-5 pt-1">
            <div className="flex gap-4">
              <InputField label="NOME" value={emissorNome} onChange={setEmissorNome} className="flex-[2]" />
              <InputField label="CARGO" value={emissorCargo} onChange={setEmissorCargo} className="flex-[1]" />
            </div>
            <div className="flex gap-4">
              <InputField label="MATRÍCULA" value={emissorMatricula} onChange={setEmissorMatricula} className="flex-[1]" />
              <div className="flex flex-col flex-[2]">
                <span className="text-[10px] font-bold uppercase mb-0.5">ASSINATURA</span>
                <div className="border-b border-black w-full pb-1 h-5"></div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* 6. RECEBIMENTO DA NOTIFICAÇÃO */}
        <fieldset className="border border-black rounded-xl pt-4 pb-4 px-4 relative mt-8 mb-4">
          <legend className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-xs font-bold font-sans tracking-wide whitespace-nowrap">
            RECEBIMENTO DA NOTIFICAÇÃO
          </legend>
          <div className="space-y-5 pt-1">
            <div className="flex gap-4">
              <InputField label="DATA E HORA" value={recebimentoDataHora} onChange={setRecebimentoDataHora} className="flex-[1]" />
              <InputField label="NOME" value={recebimentoNome} onChange={setRecebimentoNome} className="flex-[1]" />
            </div>
            <div className="flex gap-4 mt-2">
              <InputField label="CARGO/FUNÇÃO" value={recebimentoCargo} onChange={setRecebimentoCargo} className="flex-[1]" />
              <InputField label="DOCUMENTO DE IDENTIFICAÇÃO" value={recebimentoDocumento} onChange={setRecebimentoDocumento} className="flex-[1]" />
            </div>
            <div className="mt-2">
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold uppercase mb-0.5 mt-2">ASSINATURA</span>
                <div className="border-b border-black w-1/2 pb-1 h-6"></div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Footer */}
        <div className="mt-auto flex justify-between px-2 text-[8px] font-bold uppercase tracking-wider relative top-4">
          <span>1ª VIA - NOTIFICADO &nbsp; 2ª VIA - DEFESA CIVIL</span>
          <span>DC-GP/001-2024 V2</span>
        </div>

      </div>
    </div>
  );
}
