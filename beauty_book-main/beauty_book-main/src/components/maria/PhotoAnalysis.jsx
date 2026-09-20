export default function PhotoAnalysis({analysis}){
 if(!analysis)return null;
 return <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm" role="status"><p className="font-semibold">{analysis.quality_ok&&analysis.has_person?'Cadrage exploitable pour un aperçu':'Vérifiez le cadrage de votre photo'}</p>{analysis.suggestion&&<p className="text-gray-600">{analysis.suggestion}</p>}{analysis.issues?.length>0&&<ul className="list-disc pl-5 text-gray-600">{analysis.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>}</div>;
}
