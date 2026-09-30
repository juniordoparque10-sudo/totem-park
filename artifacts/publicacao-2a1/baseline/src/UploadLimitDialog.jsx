import { useEffect, useRef } from 'react';
import './upload-limit-dialog.css';
export default function UploadLimitDialog({ notice, onClose }) {
  const ref = useRef(null);
  useEffect(() => { if (notice && !ref.current.open) ref.current.showModal(); else if (!notice && ref.current.open) ref.current.close(); }, [notice]);
  return <dialog ref={ref} className="upload-limit-dialog" aria-labelledby="upload-limit-title" onCancel={onClose} onClose={onClose}>
    {notice && <><div className="upload-limit-eyebrow"><span aria-hidden="true">!</span> LIMITE DO PLANO {notice.plan.toUpperCase()}</div>
    <h2 id="upload-limit-title">Arquivo acima do limite</h2>
    <p>Tamanho da mídia precisa ser menor que <strong>{notice.limitMb.toLocaleString('pt-BR')} MB.</strong></p>
    <div className="upload-limit-upgrade"><b>Precisa enviar arquivos maiores?</b><p>{notice.upgrade ? <>Faça upgrade para o <strong>{notice.upgrade}</strong> e envie {notice.kind === 'video' ? 'vídeos' : 'imagens'} de até <strong>{notice.upgradeMb} MB.</strong></> : <>Reduza o tamanho do arquivo ou fale com nossa equipe para consultar uma opção personalizada.</>}</p></div>
    <div className="upload-limit-actions"><button type="button" autoFocus onClick={onClose}>Entendi</button></div></>}
  </dialog>;
}
