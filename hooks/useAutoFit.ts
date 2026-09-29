import { useRef, useLayoutEffect, useState } from 'react';

interface AutoFitMetrics {
  rowHeight: number;
  fontSize: number;
}

export function useAutoFit(itemCount: number, gap: number = 8, ratio: number = 0.55) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<AutoFitMetrics>({ rowHeight: 0, fontSize: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || itemCount === 0) return;

    const calculateFit = () => {
      // 1. Hauteur exacte disponible (marges internes déduites grâce à box-sizing)
      const availableHeight = container.clientHeight;
      
      // 2. Déduire l'espace total pris par les espacements (gaps) entre les lignes
      const totalGapHeight = (itemCount - 1) * Math.max(0, gap);
      
      // 3. Espace réellement utilisable pour les lignes
      const usableHeight = availableHeight - totalGapHeight;
      
      // 4. Hauteur allouée à chaque ligne
      const rowHeight = usableHeight / itemCount;
      
      // 5. Calcul de la police de caractères (ex: 55% de la hauteur de ligne)
      // Plafond ajouté (Math.min) pour éviter une police gigantesque s'il n'y a que 2 matchs
      const calculatedFontSize = Math.min(rowHeight * ratio, 45); 

      setMetrics({
        rowHeight,
        fontSize: calculatedFontSize,
      });
    };

    // Calcul initial avant peinture
    calculateFit();

    // Optionnel : Observer UNIQUEMENT le parent (qui est verrouillé par flex: 1)
    // Cela ne créera pas de boucle car la modification de la police des enfants 
    // ne change pas la taille de ce parent.
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculateFit);
    });
    
    observer.observe(container);

    return () => observer.disconnect();
  }, [itemCount, gap]); // Se redéclenche si le nombre d'équipes/matchs change

  return { containerRef, metrics };
}
