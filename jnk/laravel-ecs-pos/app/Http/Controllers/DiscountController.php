<?php

namespace App\Http\Controllers;

use App\Models\DiscountCampaign;
use Illuminate\Http\Request;

class DiscountController extends Controller
{
    public function index()
    {
        return view('discounts.index', [
            'discounts' => DiscountCampaign::latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:PERCENTAGE,FIXED'],
            'value' => ['required', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['is_active'] = $request->boolean('is_active');
        DiscountCampaign::create($data);

        return back()->with('status', 'Discount campaign saved.');
    }

    public function toggle(DiscountCampaign $discount)
    {
        $discount->update(['is_active' => ! $discount->is_active]);

        return back()->with('status', 'Discount status updated.');
    }
}
