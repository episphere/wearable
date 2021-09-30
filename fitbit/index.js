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
        To give permission for the study to access these data, please
        <button type="button" class="btn btn-outline-primary" id="donateData">Donate</button>
        `;
        const resourceTypes = ['activities/steps', 'activities/calories', 'activities/distance', 'activities/floors', 'activities/elevation'];
        let jsonData = {
            fitBitId: getProfile.user.encodedId
        };
        for(let type of resourceTypes) {
            const getActivity = await getData(`https://api.fitbit.com/1/user/-/${type}/date/today/1y.json`, access_token)
            const replacedType = type.replace(/\//g, '-');
            jsonData[type] = {}
            jsonData[type] = getActivity[replacedType];
            const div = document.createElement('div');
            div.id = replacedType;
            document.getElementById('mainDiv').appendChild(div);
            const trace1 = {
                type: 'bar',
                x: getActivity[replacedType].map(dt=> dt.dateTime),
                y: getActivity[replacedType].map(dt=> dt.value),
                opacity: 0.5,
                marker: {
                    color: 'rgb(49,130,189)'
                }
            };
              
            const data = [ trace1 ];
              
            const layout = { 
                title: replacedType,
                font: {size: 18}
            };
              
            const config = {responsive: true}
              
            Plotly.newPlot(replacedType, data, layout, config );
        }
        downloadJSONFile(jsonData)
        const getActivityList = await getData(`https://api.fitbit.com/1/user/-/activities/list.json?limit=10&sort=desc&afterDate=2021-08-23&sort=asc&offset=0`, access_token)
        console.log(getActivityList)
        const getLocation = await fetch(`https://api.fitbit.com/1/user/-/activities/42957438966.tcx`, {
            method: 'GET',
            headers:{
                Authorization:'Bearer ' + access_token
            }
        })
        console.log(await getLocation.text());
    }
}

const downloadJSONFile = (data) => {
    const donateData = document.getElementById('donateData');
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