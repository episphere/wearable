const initFitBit = () => {
    const query = location.hash.replace('#', '');
    const parameters = getparameters(query);
    if(!localStorage.fitbit && parameters.access_token) {
        localStorage.fitbit = JSON.stringify(parameters);
        window.history.replaceState({},'', './');
    }
    dashboard();
}

const dashboard = async () => {
    if(!localStorage.fitbit){
        document.getElementById('accessFitBitData').hidden = false;
        const accessFitBitData = document.getElementById('accessFitBitData');
        accessFitBitData.addEventListener('click', async () => {
            const scopes = ['profile', 'activity', 'heartrate', 'location', 'nutrition', 'sleep', 'weight']
            const oauthUrl = `https://www.fitbit.com/oauth2/authorize?client_id=23BC5Y&redirect_uri=${location.href}&response_type=token&scope=${scopes.join('%20')}`;
            location.href = oauthUrl;
        })
    }
    else if(localStorage.fitbit && JSON.parse(localStorage.fitbit).access_token) {
        const access_token = JSON.parse(localStorage.fitbit).access_token;
        
        const getProfile = await getData(`https://api.fitbit.com/1/user/-/profile.json`, access_token);
        document.getElementById('mainDiv').innerHTML = `Hello, ${getProfile.user.fullName}
        <div class="mb-3 mt-3">Thank you for participating in the PALS Study.</div>
        <div class="mb-3">You have previously answered study questions about your sleep, physical activity, commuting patterns, and reported the location of your home and workplace.</div>
        <div class="mb-3">Now we are asking you to provide similar information by donating data available from your fitness trackers and mobile phone.  This includes sleep, physical activity, and location data.</div>
        <div class="mb-3">
            To give permission for the study to access these data, please
            <button type="button" class="btn btn-outline-primary disabled" disabled id="donateData">Donate</button>
        </div>
        `;
        const resourceTypes = {
            'activities': {
                endPoint: '/list',
                parameters: `?limit=20&sort=desc&beforeDate=${new Date().toISOString().split('T')[0]}&sort=desc&offset=0`,
                responseObj: 'activities',
                location: true
            },
            'activities/steps': {
                endPoint: '/date/today/1y',
                responseObj: 'activities-steps',
                x: 'dateTime',
                y: 'value'
            },
            'activities/calories': {
                endPoint: '/date/today/1y',
                responseObj: 'activities-calories',
                x: 'dateTime',
                y: 'value'
            },
            'activities/distance': {
                endPoint: '/date/today/1y',
                responseObj: 'activities-distance',
                x: 'dateTime',
                y: 'value'
            },
            'activities/floors': {
                endPoint: '/date/today/1y',
                responseObj: 'activities-floors',
                x: 'dateTime',
                y: 'value'
            },
            'activities/elevation': {
                endPoint: '/date/today/1y',
                responseObj: 'activities-elevation',
                x: 'dateTime',
                y: 'value'
            },
            'body/weight': {
                endPoint: '/date/today/1y',
                responseObj: 'body-weight',
                x: 'dateTime',
                y: 'value'
            },
            'body/bmi': {
                endPoint: '/date/today/1y',
                responseObj: 'body-bmi',
                x: 'dateTime',
                y: 'value'
            },
            'body/fat': {
                endPoint: '/date/today/1y',
                responseObj: 'body-fat',
                x: 'dateTime',
                y: 'value'
            },
            'foods/log/caloriesIn': {
                endPoint: '/date/today/1y',
                responseObj: 'foods-log-caloriesIn',
                x: 'dateTime',
                y: 'value'
            },
            'foods/log/water': {
                endPoint: '/date/today/1y',
                responseObj: 'foods-log-water',
                x: 'dateTime',
                y: 'value'
            },
            'activities/heart': {
                endPoint: '/date/today/1m',
                responseObj: 'activities-heart',
                x: 'dateTime',
                y: 'value',
                nestedY: 'restingHeartRate',
            },
            'sleep': {
                endPoint: '/list',
                parameters: `?beforeDate=${new Date().toISOString().split('T')[0]}&sort=desc&offset=0&limit=100`,
                responseObj: 'sleep',
                x: 'dateOfSleep',
                y: 'duration'
            }
        }
        let jsonData = {
            fitBitId: getProfile.user.encodedId
        };
        for(let type in resourceTypes) {
            const responseType = resourceTypes[type].responseObj;
            const getActivity = await getData(`https://api.fitbit.com/1/user/-/${type}${resourceTypes[type].endPoint}.json${resourceTypes[type].parameters ? resourceTypes[type].parameters : ''}`, access_token)
            jsonData[type] = {}
            if(getActivity.success === false) {
                jsonData[type] = getActivity.errors[0].message;
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
                    console.log(locationXML);
                }
            }
            
            const div = document.createElement('div');
            div.id = responseType;
            document.getElementById('mainDiv').appendChild(div);
            if(!resourceTypes[type].x && !resourceTypes[type].y) continue;
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
                font: {size: 18}
            };
              
            const config = {responsive: true}
              
            Plotly.newPlot(responseType, data, layout, config );
        }
        downloadJSONFile(jsonData)
        // const getActivityList = await getData(`https://api.fitbit.com/1/user/-/activities/list.json?limit=20&sort=desc&beforeDate=${new Date().toISOString().split('T')[0]}&sort=desc&offset=0`, access_token)
        // console.log(getActivityList)
        // const activities = getActivityList.activities;
        
    }
}

const downloadJSONFile = (data) => {
    const donateData = document.getElementById('donateData');
    donateData.classList.remove('disabled');
    donateData.disabled = false;
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
    if(response.status === 401) delete localStorage.fitbit;
    return await response.json();
}

const getparameters = (query) => {
    const array = query.split('&');
    let obj = {};
    array.forEach(value => {
        obj[value.split('=')[0]] = value.split('=')[1];
    });
    return obj;
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

window.onload = () => {
    initFitBit();
}

// window.onhashchange = () => {
//     const query = location.hash.replace('#', '');
//     const parameters = getparameters(query);
//     console.log(parameters)
//     if(!localStorage.fitbit) localStorage.fitbit = JSON.stringify(parameters);
//     dashboard();
// }