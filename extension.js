const { OmnibarInterface } = require('nodecg-omnibar');
const { upcomingItemCount } = require('./config.json');
const { add } = require('date-fns');

const ITEM_DURATION = 10000;

module.exports = async nodecg => {
  const isCurrentlyUpdating = { value: false };
  const omnibar = new OmnibarInterface(nodecg);

  omnibar.registerItemType('speedcontrol-omnibar-schedule', 'schedule-item', 'Schedule - {{game}}', {
    cssAssets: ['css/omnibar-item.css'],
  });

  const omnibarState = nodecg.Replicant('nodecg-omnibar', 'nodecg-omnibar', { persistent: false });
  const runDataArray = nodecg.Replicant('runDataArray', 'nodecg-speedcontrol');
	const runDataActiveRunSurrounding = nodecg.Replicant('runDataActiveRunSurrounding', 'nodecg-speedcontrol');

  function getNextRunIndex() {
    const pendingRunId = runDataActiveRunSurrounding.value.next;
    
    for (const [index, run] of runDataArray.value.entries()) {
      if (run.id === pendingRunId) return index;
    }
    
    return -1;
  }

  function createRunItemConfig(run, estimatedStart, index) {
    const runnerTeams = run.teams.filter(team => {
      const name = team.name?.toLowerCase() ?? '';
        
      return name.indexOf('host') === -1 && name.indexOf('commentary') === -1 && name.indexOf('commentators') === -1;
    });

    const runners = runnerTeams.reduce((acc, team) => [
      ...acc, 
      ...team.players.map(player => player.name),
    ], []);

    return {
      runId: run.id,
      trackerId: run.externalID,
      game: run.game,
      category: run.category,
      runners,
      isNext: index === 0,
      estimatedStart: estimatedStart.toISOString(),
    };
  }

  async function updateUpcomingRuns() {
    if (isCurrentlyUpdating.value) {
      await new Promise((resolve) => {
        const intervalId = setInterval(() => {
          if (!isCurrentlyUpdating.value) {
            clearInterval(intervalId);
            
            resolve();
          }
        }, 0);
      });
    }

    isCurrentlyUpdating.value = true;

    const enqueuedScheduleItems = omnibarState.value.carouselQueue.filter(item => item.type === 'schedule-item');

    // Remove the existing schedule items.
    enqueuedScheduleItems.forEach(item => {
      omnibar.dequeueCarouselItem(item.id);
    });

    // Enqueue the upcoming schedule items
    const nextRunIndex = getNextRunIndex();

    if (nextRunIndex === -1) return;
  
    const actualItemCount = Math.min(runDataArray.value.length, upcomingItemCount);

    const [upcomingRuns] = [...new Array(actualItemCount)].reduce(([list, estimatedStart], _, index) => {
      const run = runDataArray.value[nextRunIndex + index];

      if (run) {
        return [
          [...list, createRunItemConfig(run, estimatedStart, index)],
          add(estimatedStart, { seconds: run.estimateS + run.setupTimeS }),
        ];
      }

      return [list, estimatedStart];
    }, [[], new Date()]);

    for (const upcomingRun of upcomingRuns) {
      await omnibar.enqueueCarouselItem('schedule-item', upcomingRun, { autoGroup: true, duration: ITEM_DURATION });
    }

    isCurrentlyUpdating.value = false;
  }

  runDataActiveRunSurrounding.on('change', updateUpcomingRuns);
};
