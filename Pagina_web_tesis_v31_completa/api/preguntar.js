// Función preparada para Vercel. No funciona hasta configurar OPENAI_API_KEY en Vercel.
// Mantener la clave SIEMPRE en variables de entorno; nunca en index.html.
export async function POST(request) {
  const headers={ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' };
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!process.env.OPENAI_API_KEY) return reply({error:'IA todavía no activada'},503);
  const contentType=request.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))return reply({error:'Envía JSON'},415);
  let body;
  try { body=await request.json(); } catch { return reply({error:'Solicitud inválida'},400); }
  const question=String(body?.question||'').trim().slice(0,1200);
  if(question.length<4)return reply({error:'Escribe una pregunta un poco más completa'},400);
  const instruction=`Eres un asistente educativo en español de Bogotá de la campaña "Antes de buscar compañía, aprende a acompañar". Ayuda a reflexionar sobre si las condiciones cotidianas permiten cuidar responsablemente a perros y gatos. Apoya la adopción responsable como primera opción. Si mencionan comprar, orienta a verificar condiciones de cría y bienestar animal y evitar prácticas de maltrato. Da respuestas cercanas, claras, prácticas y breves; no afirmes que puedes evaluar la aptitud de alguien de manera científica, ni exageres datos de un trabajo de grado. Hallazgo del proyecto: "La conciencia general sobre la responsabilidad asociada al cuidado animal no siempre se traduce en una evaluación concreta de las condiciones necesarias para sostener esa responsabilidad." Considera tiempo, costos, salud, vivienda, cambios de vida, apoyo y preparación. Si preguntan por síntomas o urgencias, remite a un veterinario; para maltrato en curso o peligro inmediato en Bogotá, menciona línea 123. No inventes precios, diagnósticos, servicios, procedimientos legales ni fuentes.`;
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),12500);
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',signal:ctrl.signal,
      headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',
        instructions:instruction,input:question,max_output_tokens:450})
    });
    if(!response.ok)return reply({error:'El proveedor de IA no respondió'},502);
    const result=await response.json();
    const answer=typeof result.output_text==='string'&&result.output_text.trim()?
      result.output_text:
      (result.output||[]).flatMap(v=>v.content||[]).filter(v=>v.type==='output_text'&&typeof v.text==='string').map(v=>v.text).join('\n');
    if(!answer||!answer.trim())return reply({error:'Sin respuesta de IA'},502);
    return reply({answer:answer.trim()});
  } catch {
    return reply({error:'Servicio de IA temporalmente no disponible'},503);
  } finally{clearTimeout(timer);}
}
