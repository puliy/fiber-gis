import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Map, AlertTriangle } from "lucide-react";

function MapBoundsLoader({
  token,
  regionId,
  onLoad,
}: {
  token: string;
  regionId: number;
  onLoad: (data: { points: any[]; cables: any[] }) => void;
}) {
  const map = useMap();
  const utils = trpc.useUtils();

  useEffect(() => {
    const load = async () => {
      const bounds = map.getBounds();
      try {
        const data = await utils.publicMap.mapData.fetch({
          token,
          regionId,
          minLat: bounds.getSouth(),
          minLng: bounds.getWest(),
          maxLat: bounds.getNorth(),
          maxLng: bounds.getEast(),
        });
        onLoad(data);
      } catch {}
    };
    load();
    map.on("moveend", load);
    return () => { map.off("moveend", load); };
  }, [map, token, regionId]);

  return null;
}

export default function PublicMapPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [mapData, setMapData] = useState<{ points: any[]; cables: any[] }>({ points: [], cables: [] });

  const { data: tokenData, isLoading, error } = trpc.publicMap.validate.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <Map className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Загрузка карты...</p>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Доступ запрещён</h2>
          <p className="text-sm text-muted-foreground">Токен недействителен или истёк срок его действия.</p>
        </div>
      </div>
    );
  }

  // Use default Voronezh center if no region data
  const center: [number, number] = [51.672, 39.212];

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700 z-10 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
          <Map className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">FiberGIS</span>
        <span className="text-xs text-gray-400 ml-2">— Публичная карта</span>
        {tokenData.name && (
          <span className="text-xs text-blue-400 ml-auto">{tokenData.name}</span>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <MapBoundsLoader
            token={token}
            regionId={tokenData.regionId ?? 1}
            onLoad={setMapData}
          />

          {mapData.points.map((pt) => (
            <CircleMarker
              key={pt.id}
              center={[Number(pt.lat), Number(pt.lng)]}
              radius={6}
              pathOptions={{ color: "#4a9eff", fillColor: "#4a9eff", fillOpacity: 0.8 }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{pt.name ?? pt.type}</div>
                  {pt.address && <div className="text-gray-500">{pt.address}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {mapData.cables.map((cable) => {
            const positions = (cable.route as { lat: number; lng: number }[]).map(
              (p) => [p.lat, p.lng] as [number, number]
            );
            return (
              <Polyline
                key={cable.id}
                positions={positions}
                pathOptions={{ color: "#ff9800", weight: 3 }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{cable.name ?? "Кабель"}</div>
                    {cable.layingType && <div className="text-gray-500">{cable.layingType}</div>}
                  </div>
                </Popup>
              </Polyline>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
