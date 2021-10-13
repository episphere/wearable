const initFitBit = () => {
    handleURLParameters();
    const parameters = getParameters();
    if(!localStorage.fitbit && parameters && parameters.access_token) localStorage.fitbit = JSON.stringify(parameters);
    dashboard();
}

const dashboard = async () => {
    if(!localStorage.fitbit){
        document.getElementById('accessFitBitData').hidden = false;
        const accessFitBitData = document.getElementById('accessFitBitData');
        accessFitBitData.addEventListener('click', async () => {
            const scopes = ['profile', 'activity', 'heartrate', 'location', 'nutrition', 'sleep', 'weight']
            const oauthUrl = `https://www.fitbit.com/oauth2/authorize?client_id=23BC5Y&redirect_uri=${location.href}&response_type=token&scope=${scopes.join('%20')}&prompt=consent`;
            location.href = oauthUrl;
        })
    }
    else if(localStorage.fitbit && JSON.parse(localStorage.fitbit).access_token) {
        const access_token = JSON.parse(localStorage.fitbit).access_token;
        const getProfile = await getData(`https://api.fitbit.com/1/user/-/profile.json`, access_token);
        if(!getProfile) {
            document.getElementById('mainDiv').innerHTML = 'Profile scope is missing! Please refresh to sign-in again!'
            delete localStorage.fitbit;
            return;
        }

        let jsonData = {};
        if(localStorage.fitBitParameters) jsonData = {...JSON.parse(localStorage.fitBitParameters)}
        document.getElementById('mainDiv').innerHTML = `Hello, ${getProfile ? getProfile.user.fullName : ''}
        <div class="mb-3 mt-3">Thank you for participating in the PALS Study.</div>
        <div class="mb-3">You have previously answered study questions about your sleep, physical activity, commuting patterns, and reported the location of your home and workplace.</div>
        <div class="mb-3">Now we are asking you to provide similar information by donating data available from your fitness trackers and mobile phone.  This includes sleep, physical activity, and location data.</div>
        <div class="mb-3">
            To give permission for the study to access these data, please
            <button type="button" class="btn btn-outline-primary disabled" disabled id="donateData">
                <div class="spinner-border" role="status" style="height: 1rem; width: 1rem;">
                    <span class="visually-hidden">Loading...</span>
                </div> 
                Donate
            </button>
        </div>
        `;
        
        const getStats = await getData(`https://api.fitbit.com/1/user/-/activities.json`, access_token);
        
        const divBest = document.createElement('div');
        divBest.classList = ['row'];

        divBest.appendChild(createCard('# Best distance <i class="fas fa-road"></i>', getStats.best.total.distance.value));
        divBest.appendChild(createCard('# Best floors <i class="fas fa-building"></i>', getStats.best.total.floors.value));
        divBest.appendChild(createCard('# Best steps <i class="fas fa-shoe-prints"></i>', getStats.best.total.steps.value));
        document.getElementById('mainDiv').appendChild(divBest);

        const divLifeTime = document.createElement('div');
        divLifeTime.classList = ['row'];

        divLifeTime.appendChild(createCard('# Life time distance <i class="fas fa-road"></i>', getStats.lifetime.total.distance));
        divLifeTime.appendChild(createCard('# Life time floors <i class="fas fa-building"></i>', getStats.lifetime.total.floors));
        divLifeTime.appendChild(createCard('# Life time steps <i class="fas fa-shoe-prints"></i>', getStats.lifetime.total.steps));
        document.getElementById('mainDiv').appendChild(divLifeTime);

        // jsonData['Stats'] = getStats;
        for(let type in resourceTypes) {
            const responseType = resourceTypes[type].responseObj;
            const getActivity = await getData(`https://api.fitbit.com/1/user/-/${type}${resourceTypes[type].endPoint}.json${resourceTypes[type].parameters ? resourceTypes[type].parameters : ''}`, access_token)
            if(!getActivity) continue;
            jsonData[type] = {}
            if(getActivity.success === false) {
                continue;
            }
            
            jsonData[type] = getActivity[responseType];
            
            if(resourceTypes[type].location) {
                let i = 0;
                for(let activity of getActivity[responseType]) {
                    const getLocation = await fetch(activity.tcxLink, {
                        method: 'GET',
                        headers:{
                            Authorization:'Bearer ' + access_token
                        }
                    })
                    const locationXML = await getLocation.text();
                    jsonData[type][i].location = locationXML
                    i++;
                }
            }

            if(resourceTypes[type].pagination) {
                const nextPage = getActivity.pagination.next;
                const allActivities = await handleRecursiveCalls(nextPage, access_token)
                jsonData[type] = [...jsonData[type], ...allActivities];
            }
            
            if(!resourceTypes[type].x && !resourceTypes[type].y) continue;
            const div = document.createElement('div');
            div.classList = ['card activity-card p-2 mt-2 mb-2'];
            const subDiv = document.createElement('div');
            subDiv.classList = ['card-body m-2'];
            subDiv.id = responseType;
            div.appendChild(subDiv);
            document.getElementById('mainDiv').appendChild(div);
            const trace1 = {
                type: 'bar',
                x: getActivity[responseType].map(dt=> dt[resourceTypes[type].x]),
                y: getActivity[responseType].map(dt=> resourceTypes[type].nestedY ? dt[resourceTypes[type].y][resourceTypes[type].nestedY] : dt[resourceTypes[type].y]),
                opacity: 0.5,
                marker: {
                    color: 'rgb(49,130,189)'
                }
            };
              
            const data = [ trace1 ];
              
            const layout = { 
                title: responseType,
                font: {size: 18},
                plot_bgcolor: 'rgba(0, 0, 0, 0)',
                paper_bgcolor: 'rgba(0, 0, 0, 0)',
                xaxis: {
                    title: {
                            text: resourceTypes[type].labelX
                        }
                    },
                yaxis: {
                    title: {
                        text: resourceTypes[type].labelY
                    }
                }
            };
              
            const config = {responsive: true, displayModeBar: false}
              
            Plotly.newPlot(responseType, data, layout, config );
        }
        downloadJSONFile(jsonData);
    }
}

const handleURLParameters = () => {
    const parameters = getParameters();
    if(parameters && Object.keys(parameters).length > 0 ){
        localStorage.fitBitParameters = JSON.stringify(parameters);
        window.history.replaceState({},'', './');
    }
}

let allActivitiesList = [];
const handleRecursiveCalls = async (url, access_token) => {
    const response = await getData(url, access_token);
    allActivitiesList = [...allActivitiesList, ...response.activities];
    const next = response.pagination.next;
    if(next) await handleRecursiveCalls(next, access_token)
    else return allActivitiesList;
}

const resourceTypes = {
    'activities': {
        endPoint: '/list',
        parameters: `?limit=20&sort=asc&afterDate=${new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]}&offset=0`,
        responseObj: 'activities',
        location: false,
        pagination: true
    },
    'activities/steps': {
        endPoint: '/date/today/1m',
        responseObj: 'activities-steps',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'steps'
    },
    'activities/calories': {
        endPoint: '/date/today/1m',
        responseObj: 'activities-calories',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'calories'
    },
    'activities/distance': {
        endPoint: '/date/today/1m',
        responseObj: 'activities-distance',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'distance'
    },
    'activities/floors': {
        endPoint: '/date/today/1m',
        responseObj: 'activities-floors',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'floors'
    },
    'activities/elevation': {
        endPoint: '/date/today/1m',
        responseObj: 'activities-elevation',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'elevation'
    },
    'activities/heart': {
        endPoint: '/date/today/1m',
        responseObj: 'activities-heart',
        x: 'dateTime',
        y: 'value',
        nestedY: 'restingHeartRate',
        labelX: 'date',
        labelY: 'heart rate'
    },
    'body/weight': {
        endPoint: '/date/today/1m',
        responseObj: 'body-weight',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'weight'
    },
    'body/bmi': {
        endPoint: '/date/today/1m',
        responseObj: 'body-bmi',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'BMI'
    },
    'body/fat': {
        endPoint: '/date/today/1m',
        responseObj: 'body-fat',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'body fat'
    },
    'foods/log/caloriesIn': {
        endPoint: '/date/today/1m',
        responseObj: 'foods-log-caloriesIn',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'calories in'
    },
    'foods/log/water': {
        endPoint: '/date/today/1m',
        responseObj: 'foods-log-water',
        x: 'dateTime',
        y: 'value',
        labelX: 'date',
        labelY: 'water'
    },
    'sleep': {
        endPoint: '/list',
        parameters: `?beforeDate=${new Date().toISOString().split('T')[0]}&sort=desc&offset=0&limit=100`,
        responseObj: 'sleep',
        x: 'dateOfSleep',
        y: 'duration',
        labelX: 'date',
        labelY: 'sleep'
    }
}

const createCard = (header, value) => {
    const div = document.createElement('div');
    div.classList = ['col-md p-2'];

    const subDiv = document.createElement('div');
    subDiv.classList = ['card stats-card col'];
    subDiv.innerHTML = `
    <div class="card-header">${header}</div>
    <div class="card-body"><h1>${numberWithCommas(value.toFixed(2))}</h1></div>`
    div.appendChild(subDiv);
    return div;
}

const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",").trim();
}

const downloadJSONFile = (data) => {
    const donateData = document.getElementById('donateData');
    donateData.classList.remove('disabled');
    donateData.disabled = false;
    donateData.innerHTML = 'Donate';
    donateData.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "activity_data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    })
}

const getData = async (url, access_token) => {
    const response = await fetch(url, {
        method: 'GET',
        headers:{
            Authorization: 'Bearer ' + access_token,
            'Accept-Language': 'en_US'
        }
    })
    if(response.status === 401 || response.status === 403) return false;
    return await response.json();
}

const xmltoJSON = (xml) => {
    let obj = {};
    xml = xml.substr(xml.lastIndexOf('?>') + 2, xml.length).replace(/\n/g,'')
    xml.replace(/<\w+/g, matched => {
        const innerAttributes = xml.substr(xml.indexOf(matched), xml.indexOf('>')+1);
        obj[matched.replace('<', '')] = '';
    })
    console.log(obj)
}

const getParameters = (URL = window.location.href) => {
    const hash = decodeURIComponent(URL);
    const index = hash.indexOf('?');
    if(index !== -1){
        let query = hash.slice(index+1, hash.length);
        query = query.replace(/#\?/g, "&")
        if(query.indexOf('#') !== -1) query = query.slice(0, query.indexOf('#'))
        const array = query.split('&');
        let obj = {};
        array.forEach(value => {
            if(value.split('=')[1].trim() === "") return;
            obj[value.split('=')[0]] = value.split('=')[1];
        });
        return obj;
    }
    else{
        return null;
    }
}

window.onload = () => {
    initFitBit();
}

window.onhashchange = () => {
    handleURLParameters();
}
