import ShapeDrawer from '@/app/components/ShapeDrawer';
import { getMaterialById } from '@/app/lib/data';
import Link from 'next/link';

interface PlannerPageProps {
    searchParams?: { materialId?: string; };
}

export default function PlannerPage({ searchParams }: PlannerPageProps) {
    const materialId = Number(searchParams?.materialId);

    if (isNaN(materialId)) {
        return (
            <div style={{ padding: 40, fontFamily: 'Arial', textAlign: 'center' }}>
                <h2>ID de material inválido.</h2>
                <Link href="/materials" style={{ color: '#007bff' }}>Por favor, selecione um material.</Link>
            </div>
        );
    }
    
    const material = getMaterialById(materialId);

    if (!material) {
        return (
            <div style={{ padding: 40, fontFamily: 'Arial', textAlign: 'center' }}>
                <h2>Material não encontrado.</h2>
                <Link href="/materials" style={{ color: '#007bff' }}>Voltar para a seleção.</Link>
            </div>
        );
    }

    return <ShapeDrawer material={material} />;
}