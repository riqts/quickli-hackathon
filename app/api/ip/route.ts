import type { NextApiRequest, NextApiResponse } from 'next'
import { IP_RULES } from '@/lib/rules/constants'
import { upstashRest } from '@/lib/upstash'
import getIP from '@/lib/get-ip'
import {upvote} from "@/lib/actions";

// From https://stackoverflow.com/a/68104187
const IP_REGEX =
    /^((?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])[.]){3}(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$/

export const PUT = async (req: NextApiRequest, res: NextApiResponse) => {
    const ip = getIP(req);
    const action = req.body.action?.trim();
    const feature = req.body.feature;

    if (!IP_REGEX.test(ip) || action !== 'upvote') {
        return res.status(400).json({ error: { message: 'Invalid request' } });
    }

    try {
        await upvote(feature, ip);

        return res.status(200).json({ done: true });
    } catch (error: any) {
        return res.status(400).json({ error: { message: error.message } });
    }
};

export const GET = async (req: NextApiRequest, res: NextApiResponse) =>
{
    const {result} = await upstashRest(['HGETALL', IP_RULES])
    const rules = []
    // We'll send the real ip to show it in the input
    const myIp = getIP(req)

    // Normalize the rules from [key, value, key, value] to [[key, value]]
    for (let i = 0; i < result.length; i += 2) {
        rules.push([result[i], JSON.parse(result[i + 1])])
    }

    return res.status(200).json({myIp, rules})
}

export const DELETE = async (req: NextApiRequest, res: NextApiResponse) =>
{

    const {ip} = req.query

    if (!ip || typeof ip !== 'string') {
        return res.status(400).json({error: {message: 'Invalid request'}})
    }

    const data = await upstashRest(['HDEL', IP_RULES, ip.trim()])
    return res.status(200).json({done: data.result === 1})
}