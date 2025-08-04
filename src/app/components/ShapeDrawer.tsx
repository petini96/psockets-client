"use client"
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Material, Shape, PolygonShape, CircleShape, Interaction, Vector, Side, Unit, ShapeType, Projection, ProjectPart } from '@/app/lib/types';
import { getProjectParts } from '@/app/lib/parts-data';

// --- Funções de Geometria e Colisão (sem alterações) ---
const unitToPx = (value: number, unit: Unit): number => { switch (unit) { case 'mm': return value; case 'cm': return value * 10; case 'm': return value * 1000; default: return value; }};
function calculateLocalVertices(sides: number, sidesLengths: Side[]): Vector[] { if (sides < 3) return []; if (sides === 4 && sidesLengths.length === 4) { const h = unitToPx(sidesLengths[0].length, sidesLengths[0].unit) / 2; const w = unitToPx(sidesLengths[1].length, sidesLengths[1].unit) / 2; return [{ x: -w, y: -h },{ x: w, y: -h },{ x: w, y: h },{ x: -w, y: h }]; } const avgLengthPx = sidesLengths.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / sides; const radius = avgLengthPx / (2 * Math.sin(Math.PI / sides)); const points: Vector[] = []; for (let i = 0; i < sides; i++) { const angle = (2 * Math.PI * i) / sides - Math.PI / 2; points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) }); } return points; }
function calculateArea(shape: Shape): number { if (shape.type === 'circle') { const radiusPx = unitToPx(shape.radius, shape.unit); return Math.PI * radiusPx * radiusPx; } if (shape.sides.length === 4) { const height = unitToPx(shape.sides[0].length, shape.sides[0].unit); const width = unitToPx(shape.sides[1].length, shape.sides[1].unit); return width * height; } if (shape.sides.length < 3) return 0; const avgLengthPx = shape.sides.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / shape.sides.length; return (shape.sides.length * avgLengthPx * avgLengthPx) / (4 * Math.tan(Math.PI / shape.sides.length)); }
function getTransformedVertices(poly: PolygonShape): Vector[] { const localVertices = calculateLocalVertices(poly.sides.length, poly.sides); const angleRad = poly.rotation * (Math.PI / 180); const cos = Math.cos(angleRad); const sin = Math.sin(angleRad); return localVertices.map(v => ({ x: (v.x * cos - v.y * sin) + poly.position.x, y: (v.x * sin + v.y * cos) + poly.position.y, })); }
function getAxes(vertices: Vector[]): Vector[] { const axes: Vector[] = []; for (let i = 0; i < vertices.length; i++) { const p1 = vertices[i]; const p2 = vertices[i + 1] || vertices[0]; const edge = { x: p2.x - p1.x, y: p2.y - p1.y }; const normal = { x: -edge.y, y: edge.x }; const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y); if(length > 0) axes.push({ x: normal.x / length, y: normal.y / length }); } return axes; }
function project(vertices: Vector[], axis: Vector): Projection { let min = Infinity, max = -Infinity; for (const vertex of vertices) { const dotProduct = vertex.x * axis.x + vertex.y * axis.y; min = Math.min(min, dotProduct); max = Math.max(max, dotProduct); } return { min, max }; }

const Grid: React.FC<{ width: number; height: number; gridSize: number }> = ({ width, height, gridSize }) => { let d = ''; for (let x = 0; x <= width; x += gridSize) { d += `M${x},0 V${height} `; } for (let y = 0; y <= height; y += gridSize) { d += `M0,${y} H${width} `; } return <path d={d} fill="none" stroke="#dcdcdc" strokeWidth="0.5" />; };
const colorPalette = [ '#a1887f', '#f06292', '#64b5f6', '#81c784', '#ffd54f', '#ff8a65', '#9575cd', '#4db6ac', '#dce775', '#bcaaa4' ];
const getColorForOrigin = (originId: number | undefined, isInteracting: boolean): string => { const opacity = isInteracting ? '0.7' : '0.5'; let baseColor = '#607d8b'; if (originId !== undefined) { baseColor = colorPalette[originId % colorPalette.length]; } const r = parseInt(baseColor.slice(1, 3), 16); const g = parseInt(baseColor.slice(3, 5), 16); const b = parseInt(baseColor.slice(5, 7), 16); return `rgba(${r}, ${g}, ${b}, ${opacity})`; };

interface TooltipData { x: number; y: number; shape: Shape; }
interface ShapeDrawerProps { material: Material; }

const ShapeDrawer: React.FC<ShapeDrawerProps> = ({ material }) => {
    const planeWidth = material.width;
    const planeHeight = material.height;

    const [shapes, setShapes] = useState<Shape[]>([]);
    const [projectParts, setProjectParts] = useState<ProjectPart[]>(getProjectParts());
    const [collisionMargin, setCollisionMargin] = useState(4);
    const [interaction, setInteraction] = useState<Interaction>(null);
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showGrid, setShowGrid] = useState(true);
    const [selectedShapeIds, setSelectedShapeIds] = useState<number[]>([]);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [highlightedCollisionId, setHighlightedCollisionId] = useState<number | null>(null);
    
    const [currentShapeType, setCurrentShapeType] = useState<ShapeType>('polygon');
    const [currentSides, setCurrentSides] = useState(4);
    const [currentSidesLengths, setCurrentSidesLengths] = useState<Side[]>([ { length: 300, unit: 'mm' }, { length: 500, unit: 'mm' }, { length: 300, unit: 'mm' }, { length: 500, unit: 'mm' }, ]);
    const [currentCircleRadius, setCurrentCircleRadius] = useState(150);
    const [currentCircleUnit, setCurrentCircleUnit] = useState<Unit>('mm');
    
    const svgRef = useRef<SVGSVGElement | null>(null);
    const shapesRef = useRef(shapes);
    useEffect(() => { shapesRef.current = shapes; }, [shapes]);

    useEffect(() => { setCurrentSidesLengths((old) => { const newSides = [...old]; const defaultSide = { length: 100, unit: 'mm' as Unit }; while (newSides.length < currentSides) { newSides.push(defaultSide); } return newSides.slice(0, currentSides); }); }, [currentSides]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIds.length > 0) {
                const updatedShapes = shapes.filter(s => !selectedShapeIds.includes(s.id));
                setShapes(updatedShapes);
                commitHistory(updatedShapes);
                setSelectedShapeIds([]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => { window.removeEventListener('keydown', handleKeyDown); };
    }, [selectedShapeIds, shapes]);

    const getMousePosition = (e: React.PointerEvent): Vector => {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return { x: 0, y: 0 };
        const viewbox = svgRef.current?.viewBox.baseVal;
        const scaleX = viewbox ? viewbox.width / svgRect.width : 1;
        const scaleY = viewbox ? viewbox.height / svgRect.height : 1;
        return { x: (e.clientX - svgRect.left) * scaleX, y: (e.clientY - svgRect.top) * scaleY };
    };

    const commitHistory = (newShapes: Shape[]) => { const newHistory = history.slice(0, historyIndex + 1); setHistory([...newHistory, newShapes]); setHistoryIndex(newHistory.length); };
    const handleAddPartFromProject = (partToAdd: ProjectPart) => { if (partToAdd.quantity <= 0) return; const newShapeInstance: Shape = { ...partToAdd.shape, id: Date.now() + Math.random(), position: { x: planeWidth / 2, y: planeHeight / 2 }, originId: partToAdd.id }; const updatedShapes = [...shapes, newShapeInstance]; setShapes(updatedShapes); commitHistory(updatedShapes); setProjectParts(currentParts => currentParts.map(p => p.id === partToAdd.id ? { ...p, quantity: p.quantity - 1 } : p)); };
    const handleUndo = () => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); setShapes(history[newIndex]); } };
    const handleRedo = () => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); setShapes(history[newIndex]); } };
    const handleAddCustomShape = () => { const newShape: Shape = currentShapeType === 'polygon' ? { id: Date.now(), type: 'polygon', sides: [...currentSidesLengths], position: { x: planeWidth / 2, y: planeHeight / 2 }, rotation: 0 } : { id: Date.now(), type: 'circle', radius: currentCircleRadius, unit: currentCircleUnit, position: { x: planeWidth / 2, y: planeHeight / 2 } }; const updatedShapes = [...shapes, newShape]; setShapes(updatedShapes); commitHistory(updatedShapes); };

    const onPointerDownOnShape = (e: React.PointerEvent<SVGElement>, shape: Shape) => { e.stopPropagation(); const mousePos = getMousePosition(e); const dx = mousePos.x - shape.position.x; const dy = mousePos.y - shape.position.y; if (e.ctrlKey || e.metaKey) { setSelectedShapeIds(prevIds => prevIds.includes(shape.id) ? prevIds.filter(id => id !== shape.id) : [...prevIds, shape.id]); return; } if (!selectedShapeIds.includes(shape.id)) { setSelectedShapeIds([shape.id]); } e.currentTarget.setPointerCapture(e.pointerId); if (selectedShapeIds.length <= 1) { if (e.altKey && shape.type === 'polygon') { setInteraction({ type: 'rotate', id: shape.id, startAngle: Math.atan2(dy, dx) * (180 / Math.PI), initialRotation: shape.rotation }); return; } if (e.shiftKey) { setInteraction({ type: 'scale', id: shape.id, initialShape: shape, initialDistance: Math.sqrt(dx * dx + dy * dy) }); return; } } const initialPositions = new Map<number, Vector>(); const idsToDrag = selectedShapeIds.includes(shape.id) ? selectedShapeIds : [shape.id]; shapes.forEach(s => { if (idsToDrag.includes(s.id)) { initialPositions.set(s.id, s.position); } }); setInteraction({ type: 'drag', id: shape.id, initialPositions }); };
    const onPointerDownOnCanvas = (e: React.PointerEvent<SVGElement>) => { const startPos = getMousePosition(e); setSelectedShapeIds([]); setInteraction({ type: 'marquee', start: startPos, end: startPos }); e.currentTarget.setPointerCapture(e.pointerId); };
    
    // ATUALIZADO: `onPointerMove` com a lógica de colisão completa e funcional
    const onPointerMove = (e: React.PointerEvent) => {
        if (!interaction) return;
        const mousePos = getMousePosition(e);
        
        switch (interaction.type) {
            case 'drag': {
                const handleInitialPos = interaction.initialPositions.get(interaction.id);
                if (!handleInitialPos) return;

                let delta = { x: mousePos.x - handleInitialPos.x, y: mousePos.y - handleInitialPos.y };
                let isColliding = false;
                
                const draggedIds = Array.from(interaction.initialPositions.keys());
                const staticShapes = shapes.filter(s => !draggedIds.includes(s.id));

                for (const draggedId of draggedIds) {
                    const initialPos = interaction.initialPositions.get(draggedId);
                    const currentShape = shapes.find(s => s.id === draggedId);
                    if (!initialPos || !currentShape || currentShape.type !== 'polygon') continue;
                    
                    const potentialShape = { ...currentShape, position: { x: initialPos.x + delta.x, y: initialPos.y + delta.y }};
                    
                    for (const staticShape of staticShapes) {
                        if (staticShape.type !== 'polygon') continue;

                        const verticesA = getTransformedVertices(potentialShape);
                        const verticesB = getTransformedVertices(staticShape);
                        const axes = [...getAxes(verticesA), ...getAxes(verticesB)];
                        let minOverlap = Infinity;
                        let mtvForThisPair: Vector | null = null;

                        for (const axis of axes) {
                            const projA = project(verticesA, axis);
                            const projB = project(verticesB, axis);
                            const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

                            if (overlap < collisionMargin) {
                                minOverlap = -1;
                                break;
                            }
                            if (overlap < minOverlap) {
                                minOverlap = overlap;
                                mtvForThisPair = { x: axis.x * (minOverlap - collisionMargin), y: axis.y * (minOverlap - collisionMargin) };
                            }
                        }
                        
                        if (minOverlap !== -1 && mtvForThisPair) {
                            isColliding = true;
                            setHighlightedCollisionId(staticShape.id);
                            const direction = { x: potentialShape.position.x - staticShape.position.x, y: potentialShape.position.y - staticShape.position.y };
                            if ((direction.x * mtvForThisPair.x + direction.y * mtvForThisPair.y) < 0) {
                                mtvForThisPair.x *= -1;
                                mtvForThisPair.y *= -1;
                            }
                            // Empurra o delta para corrigir a posição
                            delta.x += mtvForThisPair.x;
                            delta.y += mtvForThisPair.y;
                            // Atualiza a posição potencial para o próximo teste de colisão
                            potentialShape.position.x += mtvForThisPair.x;
                            potentialShape.position.y += mtvForThisPair.y;
                        }
                    }
                }
                
                if (!isColliding) setHighlightedCollisionId(null);

                setShapes(currentShapes => currentShapes.map(s => {
                    const initialPos = interaction.initialPositions.get(s.id);
                    if (initialPos) {
                        return { ...s, position: { x: initialPos.x + delta.x, y: initialPos.y + delta.y } };
                    }
                    return s;
                }));
                break;
            }
            case 'marquee': { setInteraction({ ...interaction, end: mousePos }); break; }
            case 'scale': { setShapes(currentShapes => currentShapes.map(s => { if (s.id === interaction.id) { const dx = mousePos.x - s.position.x; const dy = mousePos.y - s.position.y; const currentDistance = Math.sqrt(dx * dx + dy * dy); const scaleFactor = interaction.initialDistance > 0 ? currentDistance / interaction.initialDistance : 1; if (s.type === 'polygon' && interaction.initialShape.type === 'polygon') { return { ...s, sides: interaction.initialShape.sides.map(side => ({ ...side, length: side.length * scaleFactor })) }; } } return s; })); break; }
            case 'rotate': { setShapes(currentShapes => currentShapes.map(s => { if (s.id === interaction.id && s.type === 'polygon') { const dx = mousePos.x - s.position.x; const dy = mousePos.y - s.position.y; const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI); return { ...s, rotation: interaction.initialRotation + (currentAngle - interaction.startAngle) }; } return s; })); break; }
        }
    };
    
    const onPointerUp = (e: React.PointerEvent) => { if (!interaction) return; if (interaction.type === 'marquee') { const { start, end } = interaction; const marqueeRect = { minX: Math.min(start.x, end.x), maxX: Math.max(start.x, end.x), minY: Math.min(start.y, end.y), maxY: Math.max(start.y, end.y) }; const idsToSelect = shapes.filter(s => s.position.x > marqueeRect.minX && s.position.x < marqueeRect.maxX && s.position.y > marqueeRect.minY && s.position.y < marqueeRect.maxY).map(s => s.id); setSelectedShapeIds(idsToSelect); } if (interaction.type === 'drag' || interaction.type === 'scale' || interaction.type === 'rotate') { commitHistory(shapesRef.current); } setInteraction(null); setHighlightedCollisionId(null); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} };

    const totalArea = planeWidth * planeHeight;
    const usedArea = shapes.reduce((acc, s) => acc + calculateArea(s), 0);
    const filteredParts = projectParts.filter(part => part.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const projectPartsMap = new Map(projectParts.map(p => [p.id, p.name]));
    const controlPanelStyles: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' };
    const h4Styles: React.CSSProperties = { color: '#6d4c41', borderBottom: '2px solid #f0eade', paddingBottom: 10, marginBottom: 15, marginTop: 0 };
    const buttonStyles: React.CSSProperties = { flex: 1, padding: '10px 12px', cursor: 'pointer', borderRadius: 8, border: '1px solid #d7ccc8', background: '#efebe9', color: '#6d4c41', fontWeight: 500, transition: 'background 0.2s' };
    const marqueeBox = interaction?.type === 'marquee' ? { x: Math.min(interaction.start.x, interaction.end.x), y: Math.min(interaction.start.y, interaction.end.y), width: Math.abs(interaction.start.x - interaction.end.x), height: Math.abs(interaction.start.y - interaction.end.y), } : null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 25, padding: 25, height: 'calc(100vh - 50px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 'calc(100vh - 50px)', overflowY: 'auto', paddingRight: 10 }}>
                {/* Painéis de controle (sem alterações no JSX) */}
                <div style={controlPanelStyles}> <h4 style={h4Styles}>💡 Dicas de Uso</h4> <ul style={{margin:0, paddingLeft: 20, fontSize: '0.9em', color: '#6d4c41'}}> <li><b>Ctrl + Clique:</b> Adiciona/remove peças da seleção.</li> <li><b>Arrastar no fundo:</b> Seleciona peças em área.</li> <li><b>Alt + Arrastar:</b> Rotaciona UMA peça selecionada.</li> <li><b>Shift + Arrastar:</b> Redimensiona UMA peça selecionada.</li> <li><b>Delete/Backspace:</b> Apaga peças selecionadas.</li> </ul> </div>
                <div style={controlPanelStyles}> <h4 style={h4Styles}>📋 {material.name}</h4> <p>Dimensões: {material.width}mm x {material.height}mm</p> <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}> <label>Lâmina (mm):</label> <input type="number" min={0} value={collisionMargin} onChange={e => setCollisionMargin(Number(e.target.value))} style={{ width: '60px', padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc' }} /> </div> <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}> <input type="checkbox" id="showGrid" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> <label htmlFor="showGrid">Exibir Grade</label> </div> </div>
                <div style={controlPanelStyles}> <h4 style={h4Styles}>🧩 Peças do Projeto</h4> <input type="text" placeholder="🔎 Buscar peça..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 15 }} /> <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 10 }}> {filteredParts.length > 0 ? filteredParts.map(part => ( <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '8px 12px', background: part.quantity > 0 ? '#fafafa' : '#f0f0f0', borderRadius: 6, border: '1px solid #eee' }}> <span>{part.name} ({part.quantity}x)</span> <button onClick={() => handleAddPartFromProject(part)} disabled={part.quantity <= 0} style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: 6, border: '1px solid #ccc' }}>+ Add</button> </div> )) : <p style={{textAlign: 'center', color: '#999'}}>Nenhuma peça encontrada.</p>} </div> </div>
                <div style={controlPanelStyles}> <h4 style={h4Styles}>✏️ Criar Peça Avulsa</h4> <div> <label><input type="radio" value="polygon" checked={currentShapeType === 'polygon'} onChange={() => setCurrentShapeType('polygon')} /> Polígono</label> <label style={{ marginLeft: 15 }}><input type="radio" value="circle" checked={currentShapeType === 'circle'} onChange={() => setCurrentShapeType('circle')} /> Círculo</label> </div> {currentShapeType === 'polygon' ? ( <div style={{ marginTop: 15 }}> <label>Nº de lados: <input type="number" min={3} max={20} value={currentSides} onChange={e => setCurrentSides(Number(e.target.value))} style={{ width: '60px', padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc' }} /></label> <div style={{ marginTop: 10, maxHeight: 150, overflowY: 'auto', paddingRight: '10px' }}> {currentSidesLengths.map((side, i) => ( <div key={i} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}> Lado {i + 1}: <input type="number" min={1} value={side.length} onChange={e => setCurrentSidesLengths(old => old.map((s, idx) => idx === i ? { ...s, length: Number(e.target.value) } : s))} style={{ width: '70px', padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc' }} /> <select value={side.unit} onChange={e => setCurrentSidesLengths(old => old.map((s, idx) => idx === i ? { ...s, unit: e.target.value as Unit } : s))} style={{ padding: '5px', borderRadius: 6, border: '1px solid #ccc' }}> <option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option> </select> </div> ))} </div> </div> ) : ( <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 8 }}> <label>Raio:</label> <input type="number" min={1} value={currentCircleRadius} onChange={e => setCurrentCircleRadius(Number(e.target.value))} style={{ width: '70px', padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc' }} /> <select value={currentCircleUnit} onChange={e => setCurrentCircleUnit(e.target.value as Unit)} style={{ padding: '5px', borderRadius: 6, border: '1px solid #ccc' }}> <option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option> </select> </div> )} <button onClick={handleAddCustomShape} style={{...buttonStyles, width: '100%', flex: 'none', marginTop: 20}}>Adicionar Forma Personalizada</button> </div>
                <div style={{...controlPanelStyles, marginTop: 'auto' }}> <h4 style={h4Styles}>⚙️ Ações</h4> <div style={{ display: 'flex', gap: 10 }}> <button onClick={handleUndo} disabled={historyIndex <= 0} style={{...buttonStyles, opacity: historyIndex <= 0 ? 0.6 : 1 }}>Voltar</button> <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} style={{...buttonStyles, opacity: historyIndex >= history.length - 1 ? 0.6 : 1 }}>Avançar</button> </div> <Link href="/materials" style={{ display: 'block', textAlign: 'center', marginTop: 15, color: '#8d6e63', textDecoration: 'none' }}>← Mudar Material</Link> </div>
                <div style={{...controlPanelStyles, textAlign:'center'}}> <h4>📊 Resumo</h4> <div>Aproveitamento: <strong>{totalArea > 0 ? ((usedArea / totalArea) * 100).toFixed(1) : 0}%</strong></div> </div>
            </div>
            
            <div style={{ border: '2px solid #d7ccc8', position: 'relative', userSelect: 'none', overflow: 'hidden', borderRadius: 12, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <svg ref={svgRef} viewBox={`0 0 ${planeWidth} ${planeHeight}`} width="100%" height="100%" style={{ touchAction: 'none', display: 'block' }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerDown={onPointerDownOnCanvas}>
                    {showGrid && <Grid width={planeWidth} height={planeHeight} gridSize={50} />}
                    {shapes.map((shape) => {
                        const isInteracting = interaction?.type === 'drag' && selectedShapeIds.includes(shape.id);
                        const isSelected = selectedShapeIds.includes(shape.id);
                        const isHighlightedForCollision = shape.id === highlightedCollisionId;
                        const strokeColor = isHighlightedForCollision ? "rgba(255, 167, 38, 0.9)" : "transparent";
                        const fillColor = getColorForOrigin(shape.originId, isInteracting);
                        if (shape.type === 'polygon') {
                            const localVertices = calculateLocalVertices(shape.sides.length, shape.sides); const points = localVertices.map(v => `${v.x},${v.y}`).join(' '); const width = Math.round(unitToPx(shape.sides[1]?.length || 0, shape.sides[1]?.unit || 'mm')); const height = Math.round(unitToPx(shape.sides[0]?.length || 0, shape.sides[0]?.unit || 'mm'));
                            return (
                                <g key={shape.id} transform={`translate(${shape.position.x},${shape.position.y}) rotate(${shape.rotation})`} onPointerDown={e => onPointerDownOnShape(e, shape)} onPointerEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, shape })} onPointerMove={(e) => tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })} onPointerLeave={() => setTooltip(null)} style={{ cursor: isInteracting ? 'grabbing' : 'grab' }}>
                                    <polygon points={points} fill="none" stroke={strokeColor} strokeWidth={collisionMargin * 2} strokeLinejoin="round" />
                                    <polygon points={points} stroke={isSelected ? '#007bff' : '#5d4037'} strokeWidth={isSelected ? 4 : 1.5} fill={fillColor} />
                                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="24px" fontWeight="500" style={{ pointerEvents: 'none', textShadow: '0px 0px 4px rgba(0,0,0,0.5)' }}> {shape.sides.length === 4 ? `${width}x${height}`: `Lados: ${shape.sides.length}`} </text>
                                </g>
                            );
                        } else if (shape.type === 'circle') {
                            const radius = Math.round(unitToPx(shape.radius, shape.unit));
                             return (
                                <g key={shape.id} transform={`translate(${shape.position.x},${shape.position.y})`} onPointerDown={e => onPointerDownOnShape(e, shape)} onPointerEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, shape })} onPointerMove={(e) => tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })} onPointerLeave={() => setTooltip(null)} style={{ cursor: isInteracting ? 'grabbing' : 'grab' }}>
                                    <circle cx="0" cy="0" r={radius} fill="none" stroke={strokeColor} strokeWidth={collisionMargin * 2} />
                                    <circle cx="0" cy="0" r={radius} stroke={isSelected ? '#007bff' : '#5d4037'} strokeWidth={isSelected ? 4 : 1.5} fill={fillColor} />
                                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="24px" fontWeight="500" style={{ pointerEvents: 'none', textShadow: '0px 0px 4px rgba(0,0,0,0.5)' }}> {`R: ${radius}`} </text>
                                </g>
                            );
                        }
                        return null;
                    })}
                    {marqueeBox && ( <rect x={marqueeBox.x} y={marqueeBox.y} width={marqueeBox.width} height={marqueeBox.height} fill="rgba(0, 123, 255, 0.2)" stroke="rgba(0, 123, 255, 0.6)" strokeWidth="1" strokeDasharray="4 2" /> )}
                </svg>
            </div>

            {tooltip && (
                <div style={{ position: 'fixed', top: tooltip.y + 20, left: tooltip.x + 20, background: 'rgba(40, 40, 40, 0.9)', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', pointerEvents: 'none', zIndex: 1000, boxShadow: '0 4px 8px rgba(0,0,0,0.2)', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
                    <strong>{projectPartsMap.get(tooltip.shape.originId as number) || 'Peça Avulsa'}</strong>
                    <hr style={{ border: 'none', borderTop: '1px solid #555', margin: '4px 0'}} />
                    {tooltip.shape.type === 'polygon' && ( <div> Tipo: {tooltip.shape.sides.length === 4 ? 'Retângulo' : 'Polígono'} <br /> Dimensões: {Math.round(unitToPx(tooltip.shape.sides[1]?.length || 0, tooltip.shape.sides[1]?.unit || 'mm'))} x {Math.round(unitToPx(tooltip.shape.sides[0]?.length || 0, tooltip.shape.sides[0]?.unit || 'mm'))} mm </div> )}
                    {tooltip.shape.type === 'circle' && ( <div> Tipo: Círculo <br /> Raio: {Math.round(unitToPx(tooltip.shape.radius, tooltip.shape.unit))} mm </div> )}
                </div>
            )}
        </div>
    );
};

export default ShapeDrawer;