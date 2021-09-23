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
            const checkboxes = Array.from(document.getElementsByName('fitbitScopes'));
            const scopes = ['profile', 'activity', 'heartrate', 'location', 'nutrition', 'sleep', 'weight']
            const oauthUrl = `https://www.fitbit.com/oauth2/authorize?client_id=23BC5Y&redirect_uri=${location.href}&response_type=token&scope=${scopes.join('%20')}`;
            location.href = oauthUrl;
        })
    }
    else if(localStorage.fitbit && JSON.parse(localStorage.fitbit).access_token) {
        const access_token = JSON.parse(localStorage.fitbit).access_token;
        const getProfile = await getData(`https://api.fitbit.com/1/user/-/profile.json`, access_token);
        document.getElementById('mainDiv').innerHTML = `Hello, ${getProfile.user.fullName}`;
        const resourceTypes = ['activities/tracker/activityCalories', 'activities/tracker/steps', 'activities/tracker/distance', 'activities/tracker/floors']
        for(let type of resourceTypes) {
            const getActivity = await getData(`https://api.fitbit.com/1/user/-/${type}/date/today/1m.json`, access_token)
            const replacedType = type.replace(/\//g, '-');
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

    }
}

const getData = async (url, access_token) => {
    const response = await fetch(url, {
        method: 'GET',
        headers:{
            Authorization:"Bearer "+ access_token
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