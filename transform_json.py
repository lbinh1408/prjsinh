import json

with open('data/lessons/viet-doan-van/01-lap-dan-y.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Change flow to steps
if 'flow' in data:
    steps = data.pop('flow')
    new_steps = []
    
    for step in steps:
        new_step = {
            'id': step.get('id', ''),
            'type': step.get('type', '')
        }
        
        # Move all other properties to data
        step_data = {}
        for k, v in step.items():
            if k not in ['id', 'type']:
                step_data[k] = v
                
        new_step['data'] = step_data
        new_steps.append(new_step)
        
    data['steps'] = new_steps

with open('data/lessons/viet-doan-van/01-lap-dan-y.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

