import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export default function MapModal({ isOpen, onClose, onConfirm, initialCoords }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markerRef = useRef(null);
    const [coords, setCoords] = useState(null);
    const [placeName, setPlaceName] = useState('');
    const [coordsText, setCoordsText] = useState('Haritaya tıklayarak konum seçin');

    useEffect(() => {
        if (isOpen && mapRef.current && !mapInstance.current) {
            import('leaflet').then(L => {
                const defaultLat = initialCoords?.lat || 39.0;
                const defaultLng = initialCoords?.lng || 35.0;
                const defaultZoom = initialCoords ? 10 : 6;
                
                mapInstance.current = L.map(mapRef.current, {
                    center: [defaultLat, defaultLng],
                    zoom: defaultZoom,
                    zoomControl: true,
                    attributionControl: false
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 })
                    .addTo(mapInstance.current);

                mapInstance.current.on('click', (e) => {
                    const { lat, lng } = e.latlng;
                    const c = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
                    setCoords(c);
                    setCoordsText(`${c.lat}, ${c.lng}`);

                    if (markerRef.current) mapInstance.current.removeLayer(markerRef.current);
                    const pulseIcon = L.divIcon({ className: 'map-pulse-marker', iconSize: [24, 24], iconAnchor: [12, 12] });
                    markerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(mapInstance.current);

                    reverseGeocode(lat, lng);
                });
            });
        }
        if (isOpen && mapInstance.current) {
            setTimeout(() => mapInstance.current.invalidateSize(), 100);
        }
    }, [isOpen]);

    async function reverseGeocode(lat, lng) {
        setPlaceName('Konum belirleniyor...');
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=tr`;
            const res = await fetch(url, { headers: { 'User-Agent': 'AlerjiTakip/1.0' } });
            const data = await res.json();
            if (data?.address) {
                const city = data.address.city || data.address.town || data.address.county || data.address.state || '';
                const district = data.address.suburb || data.address.neighbourhood || data.address.village || '';
                const country = data.address.country || '';
                setPlaceName(district && district !== city ? `${district}, ${city} - ${country}` : `${city} - ${country}`);
            } else {
                setPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
        } catch {
            setPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
    }

    function handleMyLocation() {
        if (!navigator.geolocation) return;
        setPlaceName('Konumunuz belirleniyor...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const c = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
                setCoords(c);
                setCoordsText(`${c.lat}, ${c.lng}`);
                if (mapInstance.current) {
                    mapInstance.current.setView([lat, lng], 13, { animate: true });
                    import('leaflet').then(L => {
                        if (markerRef.current) mapInstance.current.removeLayer(markerRef.current);
                        const pulseIcon = L.divIcon({ className: 'map-pulse-marker', iconSize: [24, 24], iconAnchor: [12, 12] });
                        markerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(mapInstance.current);
                    });
                }
                reverseGeocode(lat, lng);
            },
            () => setPlaceName(''),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    function handleConfirm() {
        if (coords) {
            onConfirm(coords, placeName || `${coords.lat}, ${coords.lng}`);
        }
    }

    function handleClose() {
        setCoords(null);
        setPlaceName('');
        setCoordsText('Haritaya tıklayarak konum seçin');
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="map-modal-overlay show">
            <div className="map-modal">
                <div className="map-modal-header">
                    <h3>📍 Haritadan Konum Seç</h3>
                    <button className="map-close-btn" onClick={handleClose}>✕</button>
                </div>
                <div className="map-container" ref={mapRef}></div>
                <div className="map-info-bar">
                    <div className="map-coords">
                        <span className="map-coords-icon">🎯</span>
                        <span className="map-coords-text">{coordsText}</span>
                    </div>
                    <div className="map-selected-name">{placeName}</div>
                </div>
                <div className="map-actions">
                    <button className="map-myloc-btn" onClick={handleMyLocation}>
                        📍 Konumumu Bul
                    </button>
                    <button className="map-confirm-btn" disabled={!coords} onClick={handleConfirm}>
                        Polen Verilerini Getir
                    </button>
                </div>
            </div>
        </div>
    );
}
