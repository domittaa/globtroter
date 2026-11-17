"""Lista państw: polskie nazwy, stolice, inne akceptowane odpowiedzi i kontynenty.

Kontynenty: eu Europa, as Azja, af Afryka, na Ameryka Północna,
sa Ameryka Południowa, oc Australia i Oceania.
Kraj może leżeć na dwóch kontynentach (Rosja, Turcja), wtedy jest na obu mapach.
`short` to krótsza nazwa do podpisów na mapie.
"""

CONTINENTS = [
    # id, nazwa, środek rzutu (lon, lat), obszar dopasowania widoku (lon0, lat0, lon1, lat1),
    # [obszary pomijane przy dopasowaniu widoku]
    ('eu', 'Europa', (14, 52), (-25, 34.5, 44, 71.3)),
    ('as', 'Azja', (88, 30), (26, -11, 146, 56)),
    ('af', 'Afryka', (17, 2), (-25.5, -35.5, 58, 37.6)),
    ('na', 'Ameryka Północna', (-98, 42), (-168, 6.8, -52, 71.5), [(-180, 15, -150, 25)]),
    ('sa', 'Ameryka Południowa', (-60, -18), (-92, -55.8, -34, 12.6)),
    ('oc', 'Australia i Oceania', (158, -14), (112, -47.5, 191, 15)),
]

COUNTRIES = []


def C(code, name, capital, cont, aliases=(), caps=(), short=None):
    COUNTRIES.append({
        'code': code, 'name': name, 'short': short or name,
        'aliases': list(aliases), 'capital': capital, 'capitalAliases': list(caps),
        'continents': cont.split(),
    })


# --- Europa ---
C('AL', 'Albania', 'Tirana', 'eu', caps=['Tirane'])
C('AD', 'Andora', 'Andora', 'eu', ['Andorra'], ['Andorra la Vella', 'Andora la Vella', 'Andorra'])
C('AT', 'Austria', 'Wiedeń', 'eu', caps=['Wien', 'Vienna'])
C('BY', 'Białoruś', 'Mińsk', 'eu', ['Belarus'])
C('BE', 'Belgia', 'Bruksela', 'eu', caps=['Brussels', 'Bruxelles', 'Brussel'])
C('BA', 'Bośnia i Hercegowina', 'Sarajewo', 'eu', ['Bośnia', 'Bośnia Hercegowina', 'BiH'], ['Sarajevo'],
  short='Bośnia i Herc.')
C('BG', 'Bułgaria', 'Sofia', 'eu', caps=['Sofija'])
C('HR', 'Chorwacja', 'Zagrzeb', 'eu', caps=['Zagreb'])
C('CY', 'Cypr', 'Nikozja', 'eu', caps=['Nicosia', 'Lefkosia'])
C('ME', 'Czarnogóra', 'Podgorica', 'eu', ['Montenegro'], ['Podgoryca'])
C('CZ', 'Czechy', 'Praga', 'eu', ['Republika Czeska', 'Czechia'], ['Praha', 'Prague'])
C('DK', 'Dania', 'Kopenhaga', 'eu', caps=['Copenhagen', 'København', 'Kobenhavn'])
C('EE', 'Estonia', 'Tallinn', 'eu', caps=['Tallin'])
C('FI', 'Finlandia', 'Helsinki', 'eu')
C('FR', 'Francja', 'Paryż', 'eu', caps=['Paris'])
C('GR', 'Grecja', 'Ateny', 'eu', caps=['Athens', 'Athina'])
C('ES', 'Hiszpania', 'Madryt', 'eu', caps=['Madrid'])
C('NL', 'Holandia', 'Amsterdam', 'eu', ['Niderlandy'])
C('IE', 'Irlandia', 'Dublin', 'eu')
C('IS', 'Islandia', 'Reykjavík', 'eu', caps=['Rejkiawik', 'Reykiavik', 'Rejkjawik'])
C('XK', 'Kosowo', 'Prisztina', 'eu', ['Kosovo'], ['Pristina', 'Prishtina', 'Prisztyna'])
C('LI', 'Liechtenstein', 'Vaduz', 'eu', ['Lichtenstein', 'Liechtenstain', 'Lichtensztajn'], ['Waduz'])
C('LT', 'Litwa', 'Wilno', 'eu', caps=['Vilnius'])
C('LU', 'Luksemburg', 'Luksemburg', 'eu', ['Luxembourg'], ['Luxembourg'])
C('LV', 'Łotwa', 'Ryga', 'eu', caps=['Riga'])
C('MK', 'Macedonia Północna', 'Skopje', 'eu', ['Macedonia'], short='Macedonia Pn.')
C('MT', 'Malta', 'Valletta', 'eu', caps=['La Valletta', 'Valetta', 'Walletta'])
C('MD', 'Mołdawia', 'Kiszyniów', 'eu', ['Mołdowa', 'Moldova'], ['Chisinau', 'Kiszyniow', 'Kiszyniew'])
C('MC', 'Monako', 'Monako', 'eu', ['Monaco'], ['Monaco'])
C('DE', 'Niemcy', 'Berlin', 'eu')
C('NO', 'Norwegia', 'Oslo', 'eu')
C('PL', 'Polska', 'Warszawa', 'eu', caps=['Warsaw'])
C('PT', 'Portugalia', 'Lizbona', 'eu', caps=['Lisbon', 'Lisboa'])
C('RU', 'Rosja', 'Moskwa', 'eu as', ['Federacja Rosyjska'], ['Moscow'])
C('RO', 'Rumunia', 'Bukareszt', 'eu', caps=['Bucharest', 'Bucuresti'])
C('SM', 'San Marino', 'San Marino', 'eu')
C('RS', 'Serbia', 'Belgrad', 'eu', caps=['Beograd', 'Belgrade'])
C('SK', 'Słowacja', 'Bratysława', 'eu', caps=['Bratislava'])
C('SI', 'Słowenia', 'Lublana', 'eu', caps=['Ljubljana', 'Lubljana'])
C('CH', 'Szwajcaria', 'Berno', 'eu', caps=['Bern', 'Berne'])
C('SE', 'Szwecja', 'Sztokholm', 'eu', caps=['Stockholm', 'Sztockholm'])
C('TR', 'Turcja', 'Ankara', 'eu as', ['Turkiye', 'Türkiye'])
C('UA', 'Ukraina', 'Kijów', 'eu', caps=['Kyiv', 'Kiev', 'Kijew'])
C('HU', 'Węgry', 'Budapeszt', 'eu', caps=['Budapest'])
C('GB', 'Wielka Brytania', 'Londyn', 'eu', ['Zjednoczone Królestwo', 'UK'], ['London'])
C('IT', 'Włochy', 'Rzym', 'eu', ['Italia'], ['Roma', 'Rome'])
C('VA', 'Watykan', 'Watykan', 'eu', ['Państwo Watykańskie', 'Państwo Miasto Watykańskie', 'Vatican'],
  ['Vatican', 'Citta del Vaticano', 'Miasto Watykańskie'])

# --- Azja ---
C('AF', 'Afganistan', 'Kabul', 'as')
C('SA', 'Arabia Saudyjska', 'Rijad', 'as', caps=['Riyadh', 'Rijadh', 'Ar Rijad'])
C('AM', 'Armenia', 'Erywań', 'as', caps=['Erewan', 'Yerevan', 'Jerewan', 'Erywan'])
C('AZ', 'Azerbejdżan', 'Baku', 'as', ['Azerbaijan'])
C('BH', 'Bahrajn', 'Manama', 'as', ['Bahrain', 'Bahrein'])
C('BD', 'Bangladesz', 'Dhaka', 'as', ['Bangladesh'], ['Dakka', 'Dhakka', 'Dacca', 'Dakha'])
C('BT', 'Bhutan', 'Thimphu', 'as', caps=['Thimpu', 'Timphu', 'Timpu'])
C('BN', 'Brunei', 'Bandar Seri Begawan', 'as', ['Brunei Darussalam'])
C('CN', 'Chiny', 'Pekin', 'as', ['Chińska Republika Ludowa', 'ChRL'], ['Beijing', 'Peking'])
C('PH', 'Filipiny', 'Manila', 'as')
C('GE', 'Gruzja', 'Tbilisi', 'as', ['Georgia', 'Sakartwelo'], ['Tbilisi'])
C('IN', 'Indie', 'Nowe Delhi', 'as', caps=['Delhi', 'New Delhi'])
C('ID', 'Indonezja', 'Dżakarta', 'as', caps=['Jakarta', 'Djakarta'])
C('IQ', 'Irak', 'Bagdad', 'as', caps=['Baghdad'])
C('IR', 'Iran', 'Teheran', 'as', caps=['Tehran'])
C('IL', 'Izrael', 'Jerozolima', 'as', caps=['Tel Awiw', 'Tel Aviv', 'Jerusalem'])
C('JP', 'Japonia', 'Tokio', 'as', caps=['Tokyo'])
C('YE', 'Jemen', 'Sana', 'as', caps=['Sanaa', "Sana'a"])
C('JO', 'Jordania', 'Amman', 'as', caps=['Aman'])
C('KH', 'Kambodża', 'Phnom Penh', 'as', caps=['Phnom Pen', 'Pnom Penh', 'Pnom Pen'])
C('QA', 'Katar', 'Doha', 'as', ['Qatar'])
C('KZ', 'Kazachstan', 'Astana', 'as', caps=['Nur Sułtan'])
C('KG', 'Kirgistan', 'Biszkek', 'as', ['Kirgizja', 'Kirgizstan'], ['Bishkek'])
C('KR', 'Korea Południowa', 'Seul', 'as', ['Republika Korei'], ['Seoul'], short='Korea Płd.')
C('KP', 'Korea Północna', 'Pjongjang', 'as', ['KRLD', 'Koreańska Republika Ludowo-Demokratyczna'],
  ['Pyongyang', 'Phenian', 'Pjongjan'], short='Korea Płn.')
C('KW', 'Kuwejt', 'Kuwejt', 'as', ['Kuwait'], ['Kuwait', 'Al Kuwajt'])
C('LA', 'Laos', 'Wientian', 'as', caps=['Vientiane', 'Wientiane', 'Wiencjan'])
C('LB', 'Liban', 'Bejrut', 'as', caps=['Beirut', 'Bejrud'])
C('MV', 'Malediwy', 'Male', 'as', ['Maldives'], ['Malé'])
C('MY', 'Malezja', 'Kuala Lumpur', 'as')
C('MM', 'Mjanma', 'Naypyidaw', 'as', ['Birma', 'Myanmar', 'Mianma'],
  ['Naypyitaw', 'Nay Pyi Taw', 'Najpjidaw', 'Naypyidaw', 'Nejpjidaw'])
C('MN', 'Mongolia', 'Ułan Bator', 'as', caps=['Ulaanbaatar', 'Ułan Batar'])
C('NP', 'Nepal', 'Katmandu', 'as', caps=['Kathmandu'])
C('OM', 'Oman', 'Maskat', 'as', caps=['Muscat', 'Muskat'])
C('PK', 'Pakistan', 'Islamabad', 'as')
C('PS', 'Palestyna', 'Ramallah', 'as', ['Autonomia Palestyńska', 'Państwo Palestyna'],
  ['Jerozolima Wschodnia', 'Ramalla'])
C('SG', 'Singapur', 'Singapur', 'as', ['Singapore'], ['Singapore'])
C('LK', 'Sri Lanka', 'Kolombo', 'as', ['Cejlon'],
  ['Colombo', 'Sri Dźajawardanapura Kotte', 'Sri Jayawardenepura Kotte', 'Kotte'])
C('SY', 'Syria', 'Damaszek', 'as', caps=['Damascus'])
C('TJ', 'Tadżykistan', 'Duszanbe', 'as', ['Tajikistan'], ['Dushanbe', 'Duszambe'])
C('TH', 'Tajlandia', 'Bangkok', 'as', ['Tailandia'])
C('TW', 'Tajwan', 'Tajpej', 'as', ['Republika Chińska', 'Taiwan'], ['Taipei', 'Tajpei'])
C('TL', 'Timor Wschodni', 'Dili', 'as', ['Timor Leste'])
C('TM', 'Turkmenistan', 'Aszchabad', 'as', caps=['Ashgabat', 'Aszgabat', 'Aszchabat'])
C('UZ', 'Uzbekistan', 'Taszkent', 'as', caps=['Tashkent', 'Toshkent'])
C('VN', 'Wietnam', 'Hanoi', 'as', ['Vietnam'], ['Hanoj'])
C('AE', 'Zjednoczone Emiraty Arabskie', 'Abu Zabi', 'as', ['ZEA', 'Emiraty', 'Emiraty Arabskie'],
  ['Abu Dhabi', 'Abu Dabi', 'Abu Zaby'], short='ZEA')

# --- Afryka ---
C('DZ', 'Algieria', 'Algier', 'af', caps=['Algiers'])
C('AO', 'Angola', 'Luanda', 'af')
C('BJ', 'Benin', 'Porto-Novo', 'af')
C('BW', 'Botswana', 'Gaborone', 'af', caps=['Gaborene'])
C('BF', 'Burkina Faso', 'Wagadugu', 'af', ['Burkina'], ['Ouagadougou', 'Uagadugu'])
C('BI', 'Burundi', 'Gitega', 'af', caps=['Bużumbura', 'Bujumbura'])
C('TD', 'Czad', 'Ndżamena', 'af', caps=["N'Djamena", 'Ndjamena', 'Nżamena'])
C('CD', 'Demokratyczna Republika Konga', 'Kinszasa', 'af',
  ['DR Konga', 'DRK', 'Kongo Kinszasa', 'Demokratyczna Republika Kongo', 'DR Kongo'], ['Kinshasa'],
  short='DR Konga')
C('DJ', 'Dżibuti', 'Dżibuti', 'af', ['Djibouti'], ['Djibouti'])
C('EG', 'Egipt', 'Kair', 'af', caps=['Cairo'])
C('ER', 'Erytrea', 'Asmara', 'af')
C('SZ', 'Eswatini', 'Mbabane', 'af', ['Suazi', 'Suazilandia', 'Swaziland'], ['Lobamba'])
C('ET', 'Etiopia', 'Addis Abeba', 'af', caps=['Addis Ababa', 'Addis Abbeba'])
C('GA', 'Gabon', 'Libreville', 'af', caps=['Librewil'])
C('GM', 'Gambia', 'Bandżul', 'af', caps=['Banjul'])
C('GH', 'Ghana', 'Akra', 'af', caps=['Accra'])
C('GN', 'Gwinea', 'Konakry', 'af', caps=['Conakry', 'Konakri'])
C('GW', 'Gwinea Bissau', 'Bissau', 'af')
C('GQ', 'Gwinea Równikowa', 'Malabo', 'af', short='Gwinea Równ.')
C('CM', 'Kamerun', 'Jaunde', 'af', caps=['Yaoundé', 'Yaounde', 'Jaunda'])
C('KE', 'Kenia', 'Nairobi', 'af', ['Kenya'])
C('KM', 'Komory', 'Moroni', 'af')
C('CG', 'Kongo', 'Brazzaville', 'af', ['Republika Konga', 'Kongo Brazzaville'], ['Brazzawil'])
C('LS', 'Lesotho', 'Maseru', 'af', ['Lesoto'])
C('LR', 'Liberia', 'Monrovia', 'af')
C('LY', 'Libia', 'Trypolis', 'af', caps=['Tripoli', 'Trypoli'])
C('MG', 'Madagaskar', 'Antananarywa', 'af', caps=['Antananarivo'])
C('MW', 'Malawi', 'Lilongwe', 'af', caps=['Lilongwe'])
C('ML', 'Mali', 'Bamako', 'af')
C('MA', 'Maroko', 'Rabat', 'af')
C('MR', 'Mauretania', 'Nawakszut', 'af', caps=['Nouakchott', 'Nawakszott'])
C('MU', 'Mauritius', 'Port Louis', 'af', ['Mauritus'])
C('MZ', 'Mozambik', 'Maputo', 'af')
C('NA', 'Namibia', 'Windhuk', 'af', caps=['Windhoek'])
C('NE', 'Niger', 'Niamey', 'af', caps=['Niamej'])
C('NG', 'Nigeria', 'Abudża', 'af', caps=['Abuja'])
C('ZA', 'Republika Południowej Afryki', 'Pretoria', 'af', ['RPA', 'Południowa Afryka'],
  ['Kapsztad', 'Bloemfontein', 'Cape Town'], short='RPA')
C('CF', 'Republika Środkowoafrykańska', 'Bangi', 'af', ['RŚA', 'Afryka Środkowa'], ['Bangui'],
  short='Rep. Środkowoafr.')
C('CV', 'Republika Zielonego Przylądka', 'Praja', 'af',
  ['Wyspy Zielonego Przylądka', 'Cabo Verde', 'Zielony Przylądek'], ['Praia'], short='Zielony Przylądek')
C('RW', 'Rwanda', 'Kigali', 'af')
C('SN', 'Senegal', 'Dakar', 'af')
C('SC', 'Seszele', 'Wiktoria', 'af', ['Seychelles'], ['Victoria'])
C('SL', 'Sierra Leone', 'Freetown', 'af')
C('SO', 'Somalia', 'Mogadiszu', 'af', caps=['Mogadishu', 'Mogadisz'])
C('SD', 'Sudan', 'Chartum', 'af', caps=['Khartoum'])
C('SS', 'Sudan Południowy', 'Dżuba', 'af', caps=['Juba'], short='Sudan Płd.')
C('TZ', 'Tanzania', 'Dodoma', 'af')
C('TG', 'Togo', 'Lomé', 'af')
C('TN', 'Tunezja', 'Tunis', 'af')
C('UG', 'Uganda', 'Kampala', 'af')
C('CI', 'Wybrzeże Kości Słoniowej', 'Jamusukro', 'af', ['WKS', "Côte d'Ivoire"], ['Yamoussoukro'],
  short='Wybrzeże K. S.')
C('ST', 'Wyspy Świętego Tomasza i Książęca', 'São Tomé', 'af',
  ['Wyspy Św Tomasza i Książęca', 'São Tomé i Príncipe', 'Sao Tome'], ['San Tome', 'Sao Tome', 'Święty Tomasz'],
  short='Wyspy Św. Tomasza')
C('ZM', 'Zambia', 'Lusaka', 'af')
C('ZW', 'Zimbabwe', 'Harare', 'af')

# --- Ameryka Północna (z Ameryką Środkową i Karaibami) ---
C('AG', 'Antigua i Barbuda', "Saint John's", 'na', ['Antigua'], ['St Johns', 'Saint Johns'], short='Antigua')
C('BS', 'Bahamy', 'Nassau', 'na', ['Bahamas'])
C('BB', 'Barbados', 'Bridgetown', 'na')
C('BZ', 'Belize', 'Belmopan', 'na')
C('CR', 'Kostaryka', 'San José', 'na', ['Costa Rica'])
C('CU', 'Kuba', 'Hawana', 'na', caps=['Havana', 'La Habana'])
C('DM', 'Dominika', 'Roseau', 'na')
C('DO', 'Dominikana', 'Santo Domingo', 'na', ['Republika Dominikańska'])
C('GD', 'Grenada', "Saint George's", 'na', caps=['St Georges', 'Saint Georges'])
C('GT', 'Gwatemala', 'Gwatemala', 'na', ['Guatemala'], ['Guatemala', 'Ciudad de Guatemala'])
C('HT', 'Haiti', 'Port-au-Prince', 'na')
C('HN', 'Honduras', 'Tegucigalpa', 'na')
C('JM', 'Jamajka', 'Kingston', 'na', ['Jamaica'])
C('CA', 'Kanada', 'Ottawa', 'na', ['Canada'])
C('MX', 'Meksyk', 'Meksyk', 'na', ['Mexico'], ['Mexico City', 'Ciudad de México', 'Miasto Meksyk'])
C('NI', 'Nikaragua', 'Managua', 'na', ['Nicaragua'])
C('PA', 'Panama', 'Panama', 'na', caps=['Ciudad de Panamá'])
C('KN', 'Saint Kitts i Nevis', 'Basseterre', 'na', ['Saint Christopher i Nevis', 'St Kitts i Nevis', 'Saint Kitts'],
  short='St. Kitts i Nevis')
C('LC', 'Saint Lucia', 'Castries', 'na', ['St Lucia', 'Święta Łucja'])
C('VC', 'Saint Vincent i Grenadyny', 'Kingstown', 'na', ['St Vincent i Grenadyny', 'Saint Vincent'],
  short='St. Vincent')
C('SV', 'Salwador', 'San Salvador', 'na', ['El Salvador'])
C('US', 'Stany Zjednoczone', 'Waszyngton', 'na', ['USA', 'Stany Zjednoczone Ameryki', 'Stany', 'US'],
  ['Washington'], short='USA')
C('TT', 'Trynidad i Tobago', 'Port-of-Spain', 'na', ['Trynidad'], short='Trynidad i Tobago')

# --- Ameryka Południowa ---
C('AR', 'Argentyna', 'Buenos Aires', 'sa', ['Argentina'])
C('BO', 'Boliwia', 'Sucre', 'sa', caps=['La Paz'])
C('BR', 'Brazylia', 'Brasília', 'sa', caps=['Brazylia'])
C('CL', 'Chile', 'Santiago', 'sa', caps=['Santiago de Chile'])
C('CO', 'Kolumbia', 'Bogota', 'sa', ['Colombia'])
C('EC', 'Ekwador', 'Quito', 'sa', ['Ecuador'], ['Kito'])
C('GY', 'Gujana', 'Georgetown', 'sa', ['Guyana'])
C('PY', 'Paragwaj', 'Asunción', 'sa', ['Paraguay'], ['Asuncjon'])
C('PE', 'Peru', 'Lima', 'sa')
C('SR', 'Surinam', 'Paramaribo', 'sa', ['Suriname'])
C('UY', 'Urugwaj', 'Montevideo', 'sa', ['Uruguay'], ['Montewideo'])
C('VE', 'Wenezuela', 'Caracas', 'sa', ['Venezuela'], ['Karakas'])

# --- Australia i Oceania ---
C('AU', 'Australia', 'Canberra', 'oc', caps=['Kanbera', 'Canbera'])
C('FJ', 'Fidżi', 'Suva', 'oc', ['Fiji', 'Fidzi'])
C('KI', 'Kiribati', 'Tarawa', 'oc', caps=['Południowa Tarawa', 'South Tarawa', 'Tarawa Południowa'])
C('FM', 'Mikronezja', 'Palikir', 'oc', ['Sfederowane Stany Mikronezji'])
C('NR', 'Nauru', 'Jaren', 'oc', caps=['Yaren'])
C('NZ', 'Nowa Zelandia', 'Wellington', 'oc', ['New Zealand'])
C('PW', 'Palau', 'Ngerulmud', 'oc', caps=['Melekeok'])
C('PG', 'Papua-Nowa Gwinea', 'Port Moresby', 'oc', ['Papua Nowa Gwinea', 'Papua'], short='Papua-Nowa Gwinea')
C('WS', 'Samoa', 'Apia', 'oc')
C('TO', 'Tonga', 'Nukuʻalofa', 'oc', caps=['Nukualofa', "Nuku'alofa"])
C('TV', 'Tuvalu', 'Funafuti', 'oc')
C('VU', 'Vanuatu', 'Port Vila', 'oc')
C('MH', 'Wyspy Marshalla', 'Majuro', 'oc', ['Marshall', 'Wyspy Marshala'])
C('SB', 'Wyspy Salomona', 'Honiara', 'oc', ['Salomony'])
