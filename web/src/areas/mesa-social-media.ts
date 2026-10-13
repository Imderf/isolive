import type { Disposicion } from '../model.ts'

// Disposición del área en la oficina genérica (V1): estaciones, a qué etapas responden y puestos.
// Las piezas sin responsable de la mesa esperan en la bandeja (ancla) de su estación de trabajo.
// Es lo que se reemplaza con el piso 4 real del Naos en V2 y lo que el panel de administración editará.
export const disposicion: Disposicion = {
  id: 'mesa-social-media',
  nombre: 'Mesa de Social Media',
  cliente: 'Unilever',
  fuente: 'TaskBoard · Social First',
  estaciones: [
    { id: 'datos', nombre: 'Muro de datos', etapas: ['Señal detectada', 'Monitoreo', 'Seguimiento (Performance)'], tipo: 'trabajo', color: '#3B4252', zona: [-14, -9.4, -6, -2.6], ancla: [-8.75, -8.9], perfiles: ['data'] },
    { id: 'estrategia', nombre: 'Mesa de estrategia', etapas: ['Identificación/Viabilidad', 'Ideación'], tipo: 'trabajo', color: '#8E1F2A', zona: [-4, -9.4, 4, -2.6], ancla: [0, -8.9] },
    { id: 'creativo', nombre: 'Estudio creativo', etapas: ['En producción'], tipo: 'trabajo', color: '#EF3B3A', zona: [6, -9.4, 14, -2.6], ancla: [8.75, -8.9], perfiles: ['diseno', 'copy'] },
    { id: 'cliente', nombre: 'Sala de cliente', etapas: ['Validación Cliente'], tipo: 'lugar', color: '#F59E0B', zona: [-14, 1, -6, 7.6], ancla: [-10, 4.3] },
    { id: 'publicacion', nombre: 'Pantalla de publicación', etapas: ['Publicación'], tipo: 'trabajo', color: '#16A34A', zona: [6, 1, 14, 7.6], ancla: [13.9, 1.6], perfiles: ['social'] },
    { id: 'archivo', nombre: 'Archivo', etapas: ['Finalizado'], tipo: 'lugar', color: '#C9A27A', zona: [-4.5, 6.2, -1.5, 9.4], ancla: [-3, 7.8] },
    { id: 'descarte', nombre: 'Descarte', etapas: ['No Aprobado'], tipo: 'lugar', color: '#9CA3AF', zona: [-1.5, 6.2, 1.5, 9.4], ancla: [0, 7.8] },
    { id: 'congelador', nombre: 'Congelador', etapas: ['Freezing'], tipo: 'lugar', color: '#93C5FD', zona: [1.5, 6.2, 4.5, 9.4], ancla: [3, 7.8] },
  ],
  puestos: [
    { id: 'd1', pos: [-12.5, -5.2], rot: 0 }, { id: 'd2', pos: [-10, -5.2], rot: 0 }, { id: 'd3', pos: [-7.5, -5.2], rot: 0 },
    { id: 'e1', pos: [-1.2, -5.2], rot: 0 }, { id: 'e2', pos: [1.2, -5.2], rot: 0 },
    { id: 'c1', pos: [7.5, -5.2], rot: 0 }, { id: 'c2', pos: [10, -5.2], rot: 0 }, { id: 'c3', pos: [12.5, -5.2], rot: 0 },
    { id: 'k1', pos: [-1.2, 3], rot: 0 }, { id: 'k2', pos: [1.2, 3], rot: 0 },
    { id: 's1', pos: [7, 4], rot: 0 }, { id: 's2', pos: [9, 4], rot: 0 }, { id: 's3', pos: [11, 4], rot: 0 }, { id: 's4', pos: [13, 4], rot: 0 },
  ],
  // Dos personas del cliente en la sala: salen bordeando la mesa hacia la puerta (nodo 'cliente').
  visitas: [
    { id: 'v1', pos: [-11.2, 3.2], rot: Math.PI, via: [[-7.8, 3.0]] },
    { id: 'v2', pos: [-8.8, 5.4], rot: 0, via: [[-7.8, 5.6]] },
  ],
}
