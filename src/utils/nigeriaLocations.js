export const NIGERIA_STATES = [
  { name: "Abia", cities: ["Aba", "Umuahia", "Ohafia"] },
  { name: "Adamawa", cities: ["Yola", "Mubi", "Numan"] },
  { name: "Akwa Ibom", cities: ["Uyo", "Eket", "Ikot Ekpene"] },
  { name: "Anambra", cities: ["Awka", "Onitsha", "Nnewi"] },
  { name: "Bauchi", cities: ["Bauchi", "Azare", "Misau"] },
  { name: "Bayelsa", cities: ["Yenagoa", "Brass", "Ogbia"] },
  { name: "Benue", cities: ["Makurdi", "Gboko", "Otukpo"] },
  { name: "Borno", cities: ["Maiduguri", "Biu", "Konduga"] },
  { name: "Cross River", cities: ["Calabar", "Ogoja", "Ikom"] },
  { name: "Delta", cities: ["Asaba", "Warri", "Sapele"] },
  { name: "Ebonyi", cities: ["Abakaliki", "Afikpo", "Onueke"] },
  { name: "Edo", cities: ["Benin City", "Auchi", "Ekpoma"] },
  { name: "Ekiti", cities: ["Ado Ekiti", "Ikere", "Oye"] },
  { name: "Enugu", cities: ["Enugu", "Nsukka", "Oji River"] },
  { name: "FCT", cities: ["Abuja", "Gwagwalada", "Kuje"] },
  { name: "Gombe", cities: ["Gombe", "Kaltungo", "Billiri"] },
  { name: "Imo", cities: ["Owerri", "Orlu", "Okigwe"] },
  { name: "Jigawa", cities: ["Dutse", "Hadejia", "Gumel"] },
  { name: "Kaduna", cities: ["Kaduna", "Zaria", "Kafanchan"] },
  { name: "Kano", cities: ["Kano", "Wudil", "Bichi"] },
  { name: "Katsina", cities: ["Katsina", "Daura", "Funtua"] },
  { name: "Kebbi", cities: ["Birnin Kebbi", "Argungu", "Yelwa"] },
  { name: "Kogi", cities: ["Lokoja", "Okene", "Kabba"] },
  { name: "Kwara", cities: ["Ilorin", "Offa", "Omu-Aran"] },
  { name: "Lagos", cities: ["Ikeja", "Lagos Island", "Lekki", "Surulere", "Yaba", "Ajah", "Ikorodu", "Badagry"] },
  { name: "Nasarawa", cities: ["Lafia", "Keffi", "Akwanga"] },
  { name: "Niger", cities: ["Minna", "Bida", "Kontagora"] },
  { name: "Ogun", cities: ["Abeokuta", "Sagamu", "Ijebu-Ode"] },
  { name: "Ondo", cities: ["Akure", "Ondo", "Owo"] },
  { name: "Osun", cities: ["Osogbo", "Ile-Ife", "Ilesa"] },
  { name: "Oyo", cities: ["Ibadan", "Ogbomoso", "Oyo"] },
  { name: "Plateau", cities: ["Jos", "Bukuru", "Shendam"] },
  { name: "Rivers", cities: ["Port Harcourt", "Bonny", "Degema"] },
  { name: "Sokoto", cities: ["Sokoto", "Wurno", "Gwadabawa"] },
  { name: "Taraba", cities: ["Jalingo", "Wukari", "Bali"] },
  { name: "Yobe", cities: ["Damaturu", "Potiskum", "Nguru"] },
  { name: "Zamfara", cities: ["Gusau", "Kaura Namoda", "Talata Mafara"] },
];

export const buildLocation = (city, state, area) => {
  if (!city && !state) return "";
  if (!area?.trim()) return `${city}, ${state}`;
  return `${city}, ${state}, ${area}`;
};

export const parseLocation = (locationStr) => {
  if (!locationStr) return { city: "", state: "", area: "" };
  const parts = locationStr.split(",").map((p) => p.trim());
  if (parts.length === 1) return { city: parts[0], state: "", area: "" };
  if (parts.length === 2) return { city: parts[0], state: parts[1], area: "" };
  return { city: parts[0], state: parts[1], area: parts.slice(2).join(", ") };
};