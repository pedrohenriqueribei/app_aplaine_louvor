import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <h1 className="text-6xl font-black text-blue-800 mb-4 italic">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Página não encontrada</h2>
      <p className="text-slate-500 mb-10 max-w-md">Desculpe, a página que você está procurando não existe ou foi movida.</p>
      <Link 
        href="/"
        className="bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
