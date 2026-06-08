import {
  BookOpen,
  ExternalLink,
  Grid2X2,
  Heart,
  Home,
  List,
  MapPin,
  RotateCcw,
  Search,
  Star,
  Thermometer,
  Timer,
} from "lucide-react";
import { geoIdentity, geoPath } from "d3-geo";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import chinaGeoJson from "./data/china.geo.json";
import teas from "./data/teas.json";
import type { Tea } from "./types";

const teaList = teas as Tea[];
const STORAGE_KEY = "tearoom.favoriteTeaIds";
const mapWidth = 720;
const mapHeight = 520;

type ChinaFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  {
    code?: string;
    fullname?: string;
    pinyin?: string;
    center?: [number, number];
  }
>;

const typeThemes: Record<string, { tint: string; strong: string; text: string }> = {
  녹차: { tint: "#e7f1df", strong: "#55723c", text: "#304722" },
  황차: { tint: "#fbefc3", strong: "#bd8f20", text: "#6d4e08" },
  홍차: { tint: "#f4ded4", strong: "#a24730", text: "#6d2b1d" },
  우롱차: { tint: "#eee4d7", strong: "#88653d", text: "#513820" },
  암차: { tint: "#e9e0d9", strong: "#6e5038", text: "#3f2b1d" },
  보이차: { tint: "#e7ece0", strong: "#596447", text: "#333b29" },
  백차: { tint: "#f0eee6", strong: "#8a8069", text: "#514b3d" },
  흑차: { tint: "#e5e2dc", strong: "#55483d", text: "#342b24" },
  화차: { tint: "#f5e2e7", strong: "#ad5871", text: "#6d3142" },
};

const provinceByPinyin: Record<string, string> = {
  anhui: "안후이성",
  beijing: "베이징시",
  chongqing: "충칭시",
  fujian: "푸젠성",
  gansu: "간쑤성",
  guangdong: "광둥성",
  guangxi: "광시좡족자치구",
  guizhou: "구이저우성",
  hainan: "하이난성",
  henan: "허난성",
  hubei: "후베이성",
  hunan: "후난성",
  jiangsu: "장쑤성",
  jiangxi: "장시성",
  shaanxi: "산시성",
  shandong: "산둥성",
  sichuan: "쓰촨성",
  taiwan: "타이완성",
  yunnan: "윈난성",
  zhejiang: "저장성",
};

const chinaMapData = chinaGeoJson as unknown as GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  ChinaFeature["properties"]
>;
const chinaFeatures = chinaMapData.features;
const chinaProjection = geoIdentity().reflectY(true).fitExtent(
  [
    [22, 18],
    [mapWidth - 22, mapHeight - 18],
  ],
  {
    ...chinaMapData,
    features: chinaMapData.features.filter((feature) => feature.properties?.code),
  },
);
const chinaPath = geoPath(chinaProjection);

function getTheme(type: string) {
  return typeThemes[type] ?? { tint: "#f2f2f2", strong: "#6d6259", text: "#3f3934" };
}

function getTeaStyle(tea: Tea): CSSProperties {
  const theme = getTheme(tea.type);
  return {
    "--tea-tint": theme.tint,
    "--tea-strong": theme.strong,
    "--tea-text": theme.text,
  } as CSSProperties;
}

function App() {
  const [query, setQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("전체");
  const [selectedType, setSelectedType] = useState("전체");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTeaId, setActiveTeaId] = useState(teaList[0]?.id ?? "");
  const [view, setView] = useState<"library" | "room">("library");
  const [listMode, setListMode] = useState<"list" | "type">("list");
  const [hasOpenedCatalog, setHasOpenedCatalog] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const provinces = useMemo(() => ["전체", ...Array.from(new Set(teaList.map((tea) => tea.province)))], []);
  const types = useMemo(() => ["전체", ...Array.from(new Set(teaList.map((tea) => tea.type)))], []);

  const visibleTeas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return teaList.filter((tea) => {
      const matchesProvince = selectedProvince === "전체" || tea.province === selectedProvince;
      const matchesType = selectedType === "전체" || tea.type === selectedType;
      const matchesQuery =
        !normalizedQuery ||
        [tea.name, tea.hanzi, tea.region, tea.type, tea.summary, ...tea.notes]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesProvince && matchesType && matchesQuery;
    });
  }, [query, selectedProvince, selectedType]);

  const favoriteTeas = teaList.filter((tea) => favoriteIds.includes(tea.id));
  const activeTea = teaList.find((tea) => tea.id === activeTeaId) ?? visibleTeas[0] ?? teaList[0];
  const shownTeas = view === "room" ? favoriteTeas : visibleTeas;
  const groupedTeas = useMemo(() => {
    return types
      .filter((type) => type !== "전체")
      .map((type) => ({
        type,
        teas: shownTeas.filter((tea) => tea.type === type),
      }))
      .filter((group) => group.teas.length > 0);
  }, [shownTeas, types]);

  const teaCountByProvince = useMemo(() => {
    return teaList.reduce<Record<string, number>>((acc, tea) => {
      acc[tea.province] = (acc[tea.province] ?? 0) + 1;
      return acc;
    }, {});
  }, []);

  const selectProvince = (province: string) => {
    setView("library");
    setHasOpenedCatalog(true);
    setSelectedProvince(province);
    setSelectedType("전체");
    const firstTea = teaList.find((tea) => tea.province === province);
    if (firstTea) setActiveTeaId(firstTea.id);
  };

  const showMapOnly = () => {
    setView("library");
    setHasOpenedCatalog(false);
    setSelectedProvince("전체");
    setSelectedType("전체");
    setQuery("");
  };

  const toggleFavorite = (teaId: string) => {
    setFavoriteIds((current) =>
      current.includes(teaId) ? current.filter((id) => id !== teaId) : [...current, teaId],
    );
  };

  const renderTeaCard = (tea: Tea) => (
    <article
      className={`tea-card ${tea.id === activeTea.id ? "selected" : ""}`}
      key={tea.id}
      style={getTeaStyle(tea)}
      onClick={() => setActiveTeaId(tea.id)}
    >
      <div>
        <div className="card-title-row">
          <div>
            <span className="type-pill">{tea.type}</span>
            <h2>{tea.name}</h2>
          </div>
          <button
            className={`icon-button ${favoriteIds.includes(tea.id) ? "liked" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              toggleFavorite(tea.id);
            }}
            aria-label={`${tea.name} 찜하기`}
            title="찜하기"
          >
            <Heart size={18} fill={favoriteIds.includes(tea.id) ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="hanzi">{tea.hanzi}</p>
        <p>{tea.summary}</p>
      </div>
      <div className="meta-row">
        <span>
          <MapPin size={15} />
          {tea.region}
        </span>
        <span>{tea.famousArea}</span>
      </div>
    </article>
  );

  return (
    <main className={`app-shell ${!hasOpenedCatalog && view === "library" ? "map-only" : ""}`}>
      <header className="topbar">
        <button className="brand" onClick={showMapOnly}>
          <span className="brand-mark">茶</span>
          <span>tearoom</span>
        </button>
        <div className="nav-actions" aria-label="보기 전환">
          <button className={view === "library" ? "active" : ""} onClick={showMapOnly}>
            <BookOpen size={17} />
            지도
          </button>
          <button
            className={view === "room" ? "active" : ""}
            onClick={() => {
              setView("room");
              setHasOpenedCatalog(true);
            }}
          >
            <Home size={17} />
            내 차방
            <span className="count">{favoriteTeas.length}</span>
          </button>
        </div>
      </header>

      <section className="map-stage" aria-label="중국 차 산지 지도">
        <div className="map-panel">
          <div className="map-toolbar">
            <div>
              <strong>{selectedProvince === "전체" ? "China Tea Map" : selectedProvince}</strong>
              <span>{selectedProvince === "전체" ? "지역을 선택하세요" : "선택된 차 산지"}</span>
            </div>
            {hasOpenedCatalog && (
              <button onClick={showMapOnly} title="지도만 보기" aria-label="지도만 보기">
                <RotateCcw size={17} />
              </button>
            )}
          </div>

          <div className="china-map">
            <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img" aria-label="중국 성/자치구 경계 지도">
              <rect className="map-ocean" width={mapWidth} height={mapHeight} />
              {chinaFeatures.map((feature, index) => {
                const province = feature.properties?.pinyin
                  ? provinceByPinyin[feature.properties.pinyin]
                  : undefined;
                const hasTea = Boolean(province && teaCountByProvince[province]);
                const isActive = province === selectedProvince;

                return (
                  <path
                    key={feature.properties?.code ?? feature.properties?.fullname ?? `feature-${index}`}
                    className={`province-region ${hasTea ? "has-tea" : ""} ${isActive ? "active" : ""}`}
                    d={chinaPath(feature as GeoJSON.Feature) ?? undefined}
                    onClick={() => {
                      if (province) selectProvince(province);
                    }}
                  >
                    <title>{province ?? feature.properties?.fullname ?? "중국 경계"}</title>
                  </path>
                );
              })}

              {chinaFeatures.map((feature) => {
                const province = feature.properties?.pinyin
                  ? provinceByPinyin[feature.properties.pinyin]
                  : undefined;
                if (!province) return null;

                const projected = chinaPath.centroid(feature as GeoJSON.Feature);
                if (!Number.isFinite(projected[0]) || !Number.isFinite(projected[1])) return null;

                const isActive = selectedProvince === province;

                return (
                  <g
                    className={`province-label ${isActive ? "active" : ""}`}
                    key={feature.properties.code ?? province}
                    transform={`translate(${projected[0]} ${projected[1]})`}
                    onClick={() => selectProvince(province)}
                  >
                    <text>{province}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {hasOpenedCatalog && (
        <>
          <section className="toolbar" aria-label="차 검색과 필터">
            <label className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="차 이름, 향, 지역 검색"
              />
            </label>
            <select value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)}>
              {provinces.map((province) => (
                <option key={province}>{province}</option>
              ))}
            </select>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <div className="view-toggle" aria-label="목록 보기 방식">
              <button className={listMode === "list" ? "active" : ""} onClick={() => setListMode("list")}>
                <List size={16} />
                목록
              </button>
              <button className={listMode === "type" ? "active" : ""} onClick={() => setListMode("type")}>
                <Grid2X2 size={16} />
                차 종류별
              </button>
            </div>
          </section>

          <section className="content-grid">
            <div className="tea-list" aria-label={view === "room" ? "찜한 차 목록" : "차 목록"}>
              {shownTeas.length > 0 ? (
                listMode === "type" ? (
                  groupedTeas.map((group) => (
                    <section className="type-group" key={group.type} style={getTeaStyle(group.teas[0])}>
                      <h2>
                        {group.type}
                        <span>{group.teas.length}</span>
                      </h2>
                      <div className="type-group-list">{group.teas.map(renderTeaCard)}</div>
                    </section>
                  ))
                ) : (
                  shownTeas.map(renderTeaCard)
                )
              ) : (
                <div className="empty-state">
                  <Heart size={24} />
                  <p>{view === "room" ? "아직 찜한 차가 없습니다." : "조건에 맞는 차가 없습니다."}</p>
                </div>
              )}
            </div>

            {activeTea && (
              <aside className="detail-panel" style={getTeaStyle(activeTea)}>
                <div className="detail-heading">
                  <div>
                    <p className="eyebrow">{activeTea.type}</p>
                    <h2>{activeTea.name}</h2>
                    <p className="hanzi">{activeTea.hanzi}</p>
                  </div>
                  <button
                    className={`save-button ${favoriteIds.includes(activeTea.id) ? "saved" : ""}`}
                    onClick={() => toggleFavorite(activeTea.id)}
                  >
                    <Star size={17} fill={favoriteIds.includes(activeTea.id) ? "currentColor" : "none"} />
                    {favoriteIds.includes(activeTea.id) ? "내 차방" : "찜하기"}
                  </button>
                </div>

                <p className="summary">{activeTea.summary}</p>

                <div className="info-band">
                  <span>
                    <MapPin size={17} />
                    {activeTea.region}
                  </span>
                  <span>{activeTea.famousArea}</span>
                </div>

                <section>
                  <h3>제다 과정</h3>
                  <ol className="process-list">
                    {activeTea.process.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>

                <section className="brew-grid">
                  <div>
                    <Thermometer size={20} />
                    <strong>{activeTea.brew.temperature}</strong>
                    <span>물 온도</span>
                  </div>
                  <div>
                    <Timer size={20} />
                    <strong>{activeTea.brew.time}</strong>
                    <span>우림 시간</span>
                  </div>
                  <div>
                    <BookOpen size={20} />
                    <strong>{activeTea.brew.ratio}</strong>
                    <span>차와 물</span>
                  </div>
                </section>

                <section>
                  <h3>우리는 팁</h3>
                  <p>{activeTea.brew.tips}</p>
                </section>

                <section>
                  <h3>향미 노트</h3>
                  <div className="chips">
                    {activeTea.notes.map((note) => (
                      <span key={note}>{note}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>알아볼 브랜드</h3>
                  <div className="brand-list">
                    {activeTea.brands.map((brand) => (
                      <a key={brand.name} href={brand.url} target="_blank" rel="noreferrer">
                        {brand.name}
                        <ExternalLink size={14} />
                      </a>
                    ))}
                  </div>
                </section>
              </aside>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default App;
