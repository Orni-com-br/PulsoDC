import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AprWizardProps {
  ocorrenciaId: string;
  onComplete?: () => void;
}

export default function AprWizard({ ocorrenciaId, onComplete }: AprWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [observacoes, setObservacoes] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedPerigos, setSelectedPerigos] = useState<Record<string, { prob: number, cons: number }>>({});

  // Fetch Perigos Catalog
  const { data: perigos, isLoading: isLoadingPerigos } = useQuery({
    queryKey: ["apr_perigos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apr_perigos").select("*").order("categoria");
      if (error) throw error;
      return data;
    }
  });

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        (err) => console.log("Erro de geolocalização:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handlePerigoChange = (perigoId: string, field: 'prob' | 'cons', value: number) => {
    setSelectedPerigos(prev => ({
      ...prev,
      [perigoId]: {
        ...prev[perigoId],
        [field]: value
      }
    }));
  };

  const calculateRisco = (prob: number, cons: number) => {
    const score = prob * cons;
    if (score >= 15) return "muito_alto";
    if (score >= 10) return "alto";
    if (score >= 5) return "medio";
    return "baixo";
  };

  const getRiscoColor = (risco: string) => {
    switch(risco) {
      case 'muito_alto': return 'bg-red-600 text-white';
      case 'alto': return 'bg-orange-500 text-white';
      case 'medio': return 'bg-yellow-400 text-black';
      case 'baixo': return 'bg-green-500 text-white';
      default: return 'bg-gray-200 text-black';
    }
  };

  const getRiscoLabel = (risco: string) => {
    switch(risco) {
      case 'muito_alto': return 'MUITO ALTO';
      case 'alto': return 'ALTO';
      case 'medio': return 'MÉDIO';
      case 'baixo': return 'BAIXO';
      default: return 'INDEFINIDO';
    }
  };

  const calculateOverallRisk = () => {
    let maxScore = 0;
    Object.values(selectedPerigos).forEach(p => {
      if (p.prob && p.cons) {
        const score = p.prob * p.cons;
        if (score > maxScore) maxScore = score;
      }
    });
    if (maxScore >= 15) return "muito_alto";
    if (maxScore >= 10) return "alto";
    if (maxScore >= 5) return "medio";
    return "baixo";
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const overallRisk = calculateOverallRisk();
      const user = (await supabase.auth.getUser()).data.user;

      // 1. Create Avaliação
      const { data: avaliacao, error: errAv } = await supabase.from('apr_avaliacoes').insert({
        ocorrencia_id: ocorrenciaId,
        agente_id: user?.id,
        latitude: lat,
        longitude: lng,
        observacoes,
        risco_calculado: overallRisk,
        status: 'concluida'
      }).select().single();

      if (errAv) throw errAv;

      // 2. Insert Perigos
      const perigosToInsert = Object.entries(selectedPerigos).map(([perigoId, vals]) => ({
        avaliacao_id: avaliacao.id,
        perigo_id: perigoId,
        probabilidade: vals.prob,
        consequencia: vals.cons,
        risco_item: calculateRisco(vals.prob || 0, vals.cons || 0)
      })).filter(p => p.probabilidade && p.consequencia);

      if (perigosToInsert.length > 0) {
        const { error: errPerigos } = await supabase.from('apr_avaliacoes_perigos').insert(perigosToInsert);
        if (errPerigos) throw errPerigos;
      }

      // 3. Generate Actions based on Risk
      const acoes = [];
      if (overallRisk === 'muito_alto' || overallRisk === 'alto') {
        acoes.push({ avaliacao_id: avaliacao.id, descricao: "Isolar a área imediatamente num raio de segurança." });
        acoes.push({ avaliacao_id: avaliacao.id, descricao: "Acionar equipes de resposta especializadas (Bombeiros/SAMU)." });
        acoes.push({ avaliacao_id: avaliacao.id, descricao: "Evacuar edificações vizinhas." });
      } else if (overallRisk === 'medio') {
        acoes.push({ avaliacao_id: avaliacao.id, descricao: "Monitorar a situação e isolar pontos críticos isolados." });
        acoes.push({ avaliacao_id: avaliacao.id, descricao: "Notificar órgãos de fiscalização/assistência." });
      }

      if (acoes.length > 0) {
        const { error: errAcoes } = await supabase.from('apr_acoes').insert(acoes);
        if (errAcoes) throw errAcoes;
      }

      toast({
        title: "APR Registrada",
        description: "Análise Preliminar de Risco salva com sucesso.",
      });

      if (onComplete) onComplete();
      
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validPerigos = Object.values(selectedPerigos).filter(p => p.prob && p.cons);

  return (
    <Card className="w-full max-w-2xl mx-auto border-none shadow-none md:shadow-sm md:border">
      <CardHeader className="bg-primary/5 rounded-t-xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <CardTitle className="text-xl">APR-DC POA</CardTitle>
            <CardDescription>Análise Preliminar de Risco</CardDescription>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-primary/20'}`} />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {step === 0 && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              1. Local e Observações Iniciais
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input value={lat || ''} readOnly placeholder="Buscando..." className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input value={lng || ''} readOnly placeholder="Buscando..." className="bg-muted" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Observações de Cena</Label>
              <Textarea 
                placeholder="Descreva o cenário inicial encontrado, pontos de atenção e contexto geral..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(1)} className="w-full sm:w-auto">
                Próximo Passo <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              2. Matriz de Identificação de Perigos
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Avalie de 1 a 5 a Probabilidade e a Consequência para os perigos identificados na cena.
            </p>

            {isLoadingPerigos ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {perigos?.map((perigo: any) => {
                  const pVal = selectedPerigos[perigo.id]?.prob;
                  const cVal = selectedPerigos[perigo.id]?.cons;
                  const rVal = (pVal && cVal) ? calculateRisco(pVal, cVal) : null;
                  
                  return (
                    <div key={perigo.id} className={`p-4 rounded-xl border transition-colors ${pVal && cVal ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <p className="font-bold text-sm mb-1">{perigo.categoria}: {perigo.descricao}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <Label className="text-xs mb-2 block">Probabilidade (1-5)</Label>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(v => (
                              <button
                                key={v}
                                onClick={() => handlePerigoChange(perigo.id, 'prob', v)}
                                className={`flex-1 h-8 rounded text-xs font-semibold ${pVal === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs mb-2 block">Consequência (1-5)</Label>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(v => (
                              <button
                                key={v}
                                onClick={() => handlePerigoChange(perigo.id, 'cons', v)}
                                className={`flex-1 h-8 rounded text-xs font-semibold ${cVal === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {rVal && (
                        <div className="mt-3 flex items-center justify-end">
                          <span className={`text-xs px-2 py-1 rounded font-bold ${getRiscoColor(rVal)}`}>
                            Risco: {getRiscoLabel(rVal)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <Button onClick={() => setStep(2)} disabled={validPerigos.length === 0}>
                Ver Resultado <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right">
             <h3 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              3. Resumo e Plano de Ação
            </h3>
            
            <div className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center ${getRiscoColor(calculateOverallRisk())}`}>
              <span className="text-sm font-semibold opacity-90 uppercase tracking-widest mb-1">Risco Global da Cena</span>
              <span className="text-3xl font-black">{getRiscoLabel(calculateOverallRisk())}</span>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-sm">Ações Estratégicas Sugeridas (PLANCON)</h4>
              <ul className="space-y-2 text-sm text-muted-foreground bg-muted p-4 rounded-xl">
                {calculateOverallRisk() === 'muito_alto' || calculateOverallRisk() === 'alto' ? (
                  <>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/> Isolar a área imediatamente num raio de segurança.</li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/> Acionar equipes de resposta especializadas (Bombeiros/SAMU).</li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/> Evacuar edificações vizinhas.</li>
                  </>
                ) : calculateOverallRisk() === 'medio' ? (
                  <>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/> Monitorar a situação e isolar pontos críticos isolados.</li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/> Notificar órgãos de fiscalização/assistência.</li>
                  </>
                ) : (
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/> Orientar moradores e manter registro para monitoramento futuro.</li>
                )}
              </ul>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Concluir APR
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
