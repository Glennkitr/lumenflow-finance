export function downloadSvg(svgElement: SVGSVGElement, filename: string): void {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  if (!source.match(/^<svg[^>]+xmlns="/)) {
    source = source.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }

  if (!source.startsWith("<?xml")) {
    source = `<?xml version="1.0" standalone="no"?>\n${source}`;
  }

  const blob = new Blob([source], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function downloadPng(
  svgElement: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  const width =
    svgElement.viewBox.baseVal && svgElement.viewBox.baseVal.width
      ? svgElement.viewBox.baseVal.width
      : svgElement.width.baseVal.value;
  const height =
    svgElement.viewBox.baseVal && svgElement.viewBox.baseVal.height
      ? svgElement.viewBox.baseVal.height
      : svgElement.height.baseVal.value;

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("width", String(width * scale));
  clonedSvg.setAttribute("height", String(height * scale));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svgString,
  )}`;

  const img = new Image();
  const imgLoadPromise = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (event) => reject(event);
  });
  img.src = svgDataUri;

  await imgLoadPromise;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (result) => {
        resolve(result);
      },
      "image/png",
      1,
    );
  });

  if (!blob) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


